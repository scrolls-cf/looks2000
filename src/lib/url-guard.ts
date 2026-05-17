export type UrlGuardResult =
  | { ok: true; url: URL }
  | { ok: false; error: string; message: string }

function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true
  }
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true
  if (h === 'metadata.google.internal') return true
  if (isPrivateIpv4(h)) return true
  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true
  return false
}

export function validatePublicHttpUrl(site: string): UrlGuardResult {
  let url: URL
  try {
    url = new URL(site.includes('://') ? site : `https://${site}`)
  } catch {
    return { ok: false, error: 'invalid_url', message: 'Site must be a valid URL' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      error: 'invalid_url_scheme',
      message: 'Only http and https URLs are allowed',
    }
  }
  if (url.username || url.password) {
    return {
      ok: false,
      error: 'invalid_url',
      message: 'URLs with credentials are not allowed',
    }
  }
  if (isBlockedHost(url.hostname)) {
    return {
      ok: false,
      error: 'blocked_host',
      message: 'That host is not allowed',
    }
  }
  return { ok: true, url }
}
