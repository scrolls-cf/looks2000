import { collectHrefsFromResponse } from './collect-hrefs-rewriter'

const MAX_REDIRECTS = 5
export const MAX_HTML_BYTES = 250_000
const FETCH_TIMEOUT_MS = 15_000
const USER_AGENT = 'looks1999/1.0 (+https://github.com/scrolls-cf/looks1999)'

export type FetchPageResult =
  | {
      ok: true
      html: string
      finalUrl: string
      status: number
      bytesAnalyzed: number
      /** All anchor hrefs from the full response body (streamed). */
      hrefs: string[]
      xRobotsTag: string | null
    }
  | { ok: false; error: string; message: string }

export async function fetchPage(startUrl: URL): Promise<FetchPageResult> {
  let current = startUrl.href
  let redirects = 0

  while (true) {
    const guard = validateRedirectTarget(current)
    if (!guard.ok) return guard

    let res: Response
    try {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'fetch failed'
      return { ok: false, error: 'fetch_failed', message: msg }
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) {
        return {
          ok: false,
          error: 'fetch_failed',
          message: `Redirect ${res.status} without Location header`,
        }
      }
      redirects += 1
      if (redirects > MAX_REDIRECTS) {
        return {
          ok: false,
          error: 'redirect_limit',
          message: `More than ${MAX_REDIRECTS} redirects`,
        }
      }
      current = new URL(loc, current).href
      continue
    }

    if (!res.ok) {
      return {
        ok: false,
        error: 'fetch_failed',
        message: `HTTP ${res.status}`,
      }
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      return {
        ok: false,
        error: 'not_html',
        message: `Content-Type is not HTML (${ct || 'missing'})`,
      }
    }

    const hrefs = await collectHrefsFromResponse(res.clone())
    const buf = await res.arrayBuffer()
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf
    const html = new TextDecoder('utf-8', { fatal: false }).decode(slice)

    return {
      ok: true,
      html,
      finalUrl: res.url || current,
      status: res.status,
      bytesAnalyzed: slice.byteLength,
      hrefs,
      xRobotsTag: res.headers.get('x-robots-tag'),
    }
  }
}

function validateRedirectTarget(href: string): FetchPageResult | { ok: true } {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return { ok: false, error: 'fetch_failed', message: 'Invalid redirect URL' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'fetch_failed', message: 'Invalid redirect scheme' }
  }
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^127\./.test(host) ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host === '169.254.169.254'
  ) {
    return { ok: false, error: 'blocked_host', message: 'Redirect to blocked host' }
  }
  return { ok: true }
}
