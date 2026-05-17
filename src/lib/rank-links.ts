import type { DiscoveredLink, RankedLink, SkippedLink } from './discovered-link'

export const MAX_EXTRA_PAGE_FETCHES = 6

const BLOCKED_EXT =
  /\.(pdf|zip|rar|exe|dmg|docx?|xlsx?|pptx?|csv|xml|json|woff2?|ttf|eot|mp4|webm|avi|mov)(\?|$)/i

const BLOCKED_PATH =
  /\/(wp-admin|wp-login|cart|checkout|login|signin|signup|register|account)(\/|$)/i

const HIGH_VALUE_PATH =
  /(?:^|\/)(about|about-us|services|service|contact|contact-us|team|our-team|faq|faqs|pricing|menu|heating|cooling|financing|service-areas|areas|coupons|reviews|testimonials|gallery|portfolio)(?:\/|$)/i

const LOW_VALUE_PATH =
  /(?:^|\/)(privacy|terms|legal|cookie|sitemap|feed|rss|tag|category|author|page\/\d)(?:\/|$)/i

const SOCIAL_HOST =
  /(?:facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|pinterest\.com)/i

export function rankLinksForCrawl(
  links: DiscoveredLink[],
  siteOrigin: URL,
  homepageUrl: string,
): { toFetch: RankedLink[]; skipped: SkippedLink[] } {
  const skipped: SkippedLink[] = []
  const ranked: RankedLink[] = []
  const homeKey = normalizePageKey(homepageUrl)

  for (const link of links) {
    const verdict = scoreLink(link, siteOrigin, homeKey)
    if (verdict.score < 0) {
      skipped.push({ url: link.absolute_url, reason: verdict.reasons.join('; ') })
      continue
    }
    ranked.push({
      ...link,
      score: verdict.score,
      reasons: verdict.reasons,
    })
  }

  ranked.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const toFetch: RankedLink[] = []
  for (const link of ranked) {
    const key = normalizePageKey(link.absolute_url)
    if (seen.has(key)) continue
    seen.add(key)
    if (toFetch.length >= MAX_EXTRA_PAGE_FETCHES) {
      skipped.push({
        url: link.absolute_url,
        reason: 'over_page_budget',
      })
      continue
    }
    toFetch.push(link)
  }

  return { toFetch, skipped }
}

function scoreLink(
  link: DiscoveredLink,
  siteOrigin: URL,
  homeKey: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let url: URL
  try {
    url = new URL(link.absolute_url)
  } catch {
    return { score: -1, reasons: ['invalid_url'] }
  }

  if (url.origin !== siteOrigin.origin) {
    return { score: -1, reasons: ['external'] }
  }

  if (SOCIAL_HOST.test(url.href)) {
    return { score: -1, reasons: ['social'] }
  }

  const key = normalizePageKey(url.href)
  if (key === homeKey) {
    return { score: -1, reasons: ['homepage'] }
  }

  if (BLOCKED_EXT.test(url.pathname)) {
    return { score: -1, reasons: ['file_download'] }
  }

  if (BLOCKED_PATH.test(url.pathname)) {
    return { score: -1, reasons: ['low_value_path'] }
  }

  let score = 10
  reasons.push('same_origin')

  if (link.label.length >= 2 && link.label.length <= 80) {
    score += 8
    reasons.push('nav_label')
  }

  if (HIGH_VALUE_PATH.test(url.pathname)) {
    score += 25
    reasons.push('high_value_path')
  }

  if (LOW_VALUE_PATH.test(url.pathname)) {
    score -= 20
    reasons.push('legal_or_index')
  }

  const depth = url.pathname.split('/').filter(Boolean).length
  if (depth <= 2) {
    score += 5
    reasons.push('shallow_path')
  } else if (depth > 4) {
    score -= 8
    reasons.push('deep_path')
  }

  if (url.search.length > 0) {
    score -= 5
    reasons.push('has_query')
  }

  if (score < 5) {
    return { score: -1, reasons: [...reasons, 'below_threshold'] }
  }

  return { score, reasons }
}

function normalizePageKey(href: string): string {
  try {
    const u = new URL(href)
    u.hash = ''
    const path = u.pathname.replace(/\/+$/, '') || '/'
    return `${u.origin}${path}`.toLowerCase()
  } catch {
    return href.toLowerCase()
  }
}
