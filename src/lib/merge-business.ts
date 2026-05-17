import type { BusinessInfo } from './analyze-types'
import type { ParsedPage } from './parse-html'

export function mergeBusinessInfo(
  base: BusinessInfo,
  parsed: ParsedPage,
): BusinessInfo {
  return {
    name: base.name ?? parsed.business.name,
    phones: dedupe(base.phones, parsed.business.phones),
    emails: dedupe(base.emails, parsed.business.emails),
    address: base.address ?? parsed.business.address,
    social_links: dedupe(base.social_links, parsed.business.social_links),
  }
}

function dedupe(a: string[], b: string[]): string[] {
  const out = [...a]
  for (const item of b) {
    if (item && !out.includes(item)) out.push(item)
  }
  return out
}
