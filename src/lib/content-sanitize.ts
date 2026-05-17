/** Strip chrome and Wix noise before visible-text extraction. */

export function prepareHtmlForContentExtract(html: string): string {
  let s = html
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
  s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  s = s.replace(/\sstyle=["'][^"']*["']/gi, ' ')
  return s
}

export function cleanExtractedText(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim()
  if (!t) return ''

  t = t.replace(/#comp-[a-z0-9_-]+/gi, ' ')
  t = t.replace(/\[data-[a-z-]+(?:="[^"]*")?\]/gi, ' ')
  t = t.replace(/\{[^{}]{0,300}\}/g, ' ')
  t = t.replace(/\bsvg\b/gi, ' ')
  t = t.replace(/\bOUR SERVICES\b/gi, ' ')
  t = t.replace(/\bServices\s+(?=#comp)/gi, ' ')
  t = t.replace(/\s+/g, ' ').trim()

  if (t.length < 2) return ''
  if (/^[#.{}\[\];:\\/|]+$/i.test(t)) return ''
  if (/^#comp-/i.test(t)) return ''
  if (/\{[^}]*fill\s*:/i.test(t)) return ''
  if ((t.match(/#/g) || []).length >= 2 && t.length < 80) return ''

  return t.slice(0, 1200)
}

export function isJunkHeading(text: string): boolean {
  const t = text.trim()
  if (t.length < 2) return true
  if (t.length > 140) return true
  if (/^contact us now$/i.test(t)) return true
  if (/^#comp-/i.test(t)) return true
  if (/#comp-[a-z0-9]/i.test(t)) return true
  if (/\{[^}]*fill\s*:/i.test(t)) return true
  if (/^our services$/i.test(t)) return true
  return false
}

export function isJunkBullet(text: string): boolean {
  return isJunkHeading(text) || cleanExtractedText(text).length < 2
}
