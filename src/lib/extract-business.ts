import type { BusinessInfo } from './analyze-types'

const SOCIAL_HOSTS =
  /(?:facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com)/i

export function extractBusiness(
  html: string,
  structuredData: unknown[],
): BusinessInfo {
  const fromLd = extractFromJsonLd(structuredData)
  const fromHtml = extractFromHtml(html)
  return {
    name: fromLd.name ?? fromHtml.name,
    phones: dedupeStrings([...fromLd.phones, ...fromHtml.phones]),
    emails: dedupeStrings([...fromLd.emails, ...fromHtml.emails]),
    address: fromLd.address ?? fromHtml.address,
    social_links: dedupeStrings([...fromLd.social_links, ...fromHtml.social_links]),
  }
}

export function extractPoweredBy(html: string): string | null {
  const m = /powered\s+by\s+([^.<\n|]+?)(?:\s*[.|]|\s*$|<)/i.exec(html)
  if (!m) return null
  const label = m[1].trim().replace(/\s+/g, ' ')
  return label.length > 0 && label.length <= 120 ? label : null
}

function extractFromHtml(html: string): BusinessInfo {
  const phones: string[] = []
  const emails: string[] = []
  const social_links: string[] = []

  const telRe = /href=["']tel:([^"'?#]+)/gi
  let tm: RegExpExecArray | null
  while ((tm = telRe.exec(html))) {
    const p = normalizePhone(tm[1])
    if (p) phones.push(p)
  }

  const mailRe = /href=["']mailto:([^"'?#]+)/gi
  let em: RegExpExecArray | null
  while ((em = mailRe.exec(html))) {
    const e = em[1].split('?')[0].trim().toLowerCase()
    if (e && !emails.includes(e)) emails.push(e)
  }

  const emailTextRe =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  let et: RegExpExecArray | null
  while ((et = emailTextRe.exec(html.slice(0, 200_000)))) {
    const e = et[0].toLowerCase()
    if (!/wixpress|sentry|example\.com/.test(e) && !emails.includes(e)) {
      emails.push(e)
    }
  }

  const phoneTextRe =
    /(?:\+1\s*)?(?:\(\d{3}\)\s*|\d{3}[-.\s])\d{3}[-.\s]\d{4}/g
  let pt: RegExpExecArray | null
  while ((pt = phoneTextRe.exec(html.slice(0, 200_000)))) {
    const p = normalizePhone(pt[0])
    if (p && !phones.includes(p)) phones.push(p)
  }

  const hrefRe = /href=["'](https?:\/\/[^"']+)["']/gi
  let hm: RegExpExecArray | null
  while ((hm = hrefRe.exec(html.slice(0, 250_000)))) {
    const url = hm[1]
    if (SOCIAL_HOSTS.test(url) && !social_links.includes(url)) {
      social_links.push(url.split('?')[0])
    }
  }

  return {
    name: null,
    phones,
    emails,
    address: null,
    social_links,
  }
}

function extractFromJsonLd(blocks: unknown[]): BusinessInfo {
  let name: string | null = null
  const phones: string[] = []
  const emails: string[] = []
  let address: string | null = null
  const social_links: string[] = []

  for (const block of blocks) {
    walkJsonLd(block, (node) => {
      if (!node || typeof node !== 'object') return
      const rec = node as Record<string, unknown>
      const type = String(rec['@type'] ?? '')
      const isBusiness =
        /LocalBusiness|Organization|Store|ProfessionalService|HomeAndConstructionBusiness/i.test(
          type,
        )

      if (typeof rec.name === 'string' && (!name || isBusiness)) {
        name = rec.name.trim()
      }
      if (typeof rec.telephone === 'string') {
        const p = normalizePhone(rec.telephone)
        if (p) phones.push(p)
      }
      if (typeof rec.email === 'string') {
        const e = rec.email.trim().toLowerCase()
        if (e) emails.push(e)
      }
      if (rec.address && typeof rec.address === 'object') {
        const formatted = formatPostalAddress(
          rec.address as Record<string, unknown>,
        )
        if (formatted) address = formatted
      }
      if (Array.isArray(rec.sameAs)) {
        for (const link of rec.sameAs) {
          if (typeof link === 'string' && SOCIAL_HOSTS.test(link)) {
            social_links.push(link.split('?')[0])
          }
        }
      }
    })
  }

  return {
    name,
    phones: dedupeStrings(phones),
    emails: dedupeStrings(emails),
    address,
    social_links: dedupeStrings(social_links),
  }
}

function walkJsonLd(
  node: unknown,
  visit: (n: Record<string, unknown>) => void,
): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, visit)
    return
  }
  const rec = node as Record<string, unknown>
  visit(rec)
  if (Array.isArray(rec['@graph'])) {
    for (const item of rec['@graph']) walkJsonLd(item, visit)
  }
}

function formatPostalAddress(addr: Record<string, unknown>): string | null {
  const parts = [
    addr.streetAddress,
    addr.addressLocality,
    addr.addressRegion,
    addr.postalCode,
    addr.addressCountry,
  ]
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .map((p) => String(p).trim())
  return parts.length > 0 ? parts.join(', ') : null
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.replace(/\D/g, '').length < 10) return null
  return raw.replace(/\s+/g, ' ').trim().slice(0, 32)
}

function dedupeStrings(items: string[]): string[] {
  const out: string[] = []
  for (const item of items) {
    const t = item.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}
