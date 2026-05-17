const CONTENT_PATH = '/browser-rendering/content'
const USER_AGENT = 'looks2000/1.0 (+https://github.com/scrolls-cf/looks2000)'

/** Platforms where static HTML is usually a shell — use networkidle per CF docs. */
const JS_HEAVY_PLATFORMS = new Set(['wix', 'squarespace', 'webflow', 'godaddy'])

export type BrowserRenderingLoadProfile = 'static' | 'js_heavy'

export type FetchRenderedHtmlResult =
  | { ok: true; html: string; browser_ms_used: number; profile: BrowserRenderingLoadProfile }
  | { ok: false; error: string; message: string; profile: BrowserRenderingLoadProfile }

export function resolveLoadProfile(
  platformId: string | null | undefined,
  hasPageCopy: boolean,
): BrowserRenderingLoadProfile {
  if (platformId && JS_HEAVY_PLATFORMS.has(platformId)) return 'js_heavy'
  if (!hasPageCopy) return 'js_heavy'
  return 'static'
}

export async function fetchRenderedHtml(
  accountId: string,
  apiToken: string,
  url: string,
  profile: BrowserRenderingLoadProfile = 'js_heavy',
): Promise<FetchRenderedHtmlResult> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}${CONTENT_PATH}`
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildContentRequestBody(url, profile)),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'request failed'
    return { ok: false, error: 'rendering_request_failed', message: msg, profile }
  }

  const browser_ms_used = parseBrowserMsHeader(res.headers.get('X-Browser-Ms-Used'))

  let payload: unknown
  try {
    payload = await res.json()
  } catch {
    return {
      ok: false,
      error: 'rendering_bad_response',
      message: `HTTP ${res.status}: non-JSON response`,
      profile,
    }
  }

  if (!res.ok) {
    const message = formatApiErrors(payload) || `HTTP ${res.status}`
    return { ok: false, error: 'rendering_api_error', message, profile }
  }

  const rec = payload as Record<string, unknown>
  if (rec.success !== true) {
    return {
      ok: false,
      error: 'rendering_api_error',
      message: formatApiErrors(payload) || 'Browser Rendering API returned success=false',
      profile,
    }
  }

  const html = typeof rec.result === 'string' ? rec.result : ''
  if (!html) {
    return {
      ok: false,
      error: 'rendering_empty_html',
      message: 'Browser Rendering API returned empty HTML',
      profile,
    }
  }

  return { ok: true, html, browser_ms_used, profile }
}

function buildContentRequestBody(url: string, profile: BrowserRenderingLoadProfile) {
  const jsHeavy = profile === 'js_heavy'
  return {
    url,
    userAgent: USER_AGENT,
    gotoOptions: {
      waitUntil: jsHeavy ? 'networkidle2' : 'domcontentloaded',
      timeout: jsHeavy ? 45_000 : 25_000,
    },
    waitForTimeout: jsHeavy ? 3_000 : 1_500,
  }
}

function parseBrowserMsHeader(raw: string | null): number {
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function formatApiErrors(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const errors = (payload as Record<string, unknown>).errors
  if (!Array.isArray(errors) || errors.length === 0) return null
  const parts: string[] = []
  for (const err of errors) {
    if (err && typeof err === 'object') {
      const msg = (err as Record<string, unknown>).message
      if (typeof msg === 'string' && msg.trim()) parts.push(msg.trim())
    }
  }
  return parts.length ? parts.join('; ') : null
}
