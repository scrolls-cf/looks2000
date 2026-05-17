const CONTENT_PATH = '/browser-rendering/content'
const USER_AGENT = 'looks2000/1.0 (+https://github.com/scrolls-cf/looks2000)'

export type FetchRenderedHtmlResult =
  | { ok: true; html: string; browser_ms_used: number }
  | { ok: false; error: string; message: string }

export async function fetchRenderedHtml(
  accountId: string,
  apiToken: string,
  url: string,
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
      body: JSON.stringify({
        url,
        userAgent: USER_AGENT,
        gotoOptions: {
          waitUntil: 'domcontentloaded',
          timeout: 25_000,
        },
        waitForTimeout: 1500,
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'request failed'
    return { ok: false, error: 'rendering_request_failed', message: msg }
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
    }
  }

  if (!res.ok) {
    const message = formatApiErrors(payload) || `HTTP ${res.status}`
    return { ok: false, error: 'rendering_api_error', message }
  }

  const rec = payload as Record<string, unknown>
  if (rec.success !== true) {
    return {
      ok: false,
      error: 'rendering_api_error',
      message: formatApiErrors(payload) || 'Browser Rendering API returned success=false',
    }
  }

  const html = typeof rec.result === 'string' ? rec.result : ''
  if (!html) {
    return {
      ok: false,
      error: 'rendering_empty_html',
      message: 'Browser Rendering API returned empty HTML',
    }
  }

  return { ok: true, html, browser_ms_used }
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
