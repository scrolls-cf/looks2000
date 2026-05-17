import type { BrandAsset, BusinessInfo, ContentSection, SiteSummary } from './analyze-types'
import type { CrawlBlocker } from './crawl-policy'
import type { PageContent, SiteContent } from './page-content'

/** Flat, compact JSON for LLM ingestion and UI copy (built on the Worker). */
export type AgentHandoffRoute = {
  path: string
  label: string
  title?: string
}

export type AgentHandoffPage = {
  path: string
  h1: string | null
  headings?: string[]
  body?: string
  ctas?: string[]
}

export type AgentHandoffCrawl = {
  browser: 'available' | 'blocked'
  suggest_browser?: boolean
  blockers?: CrawlBlocker[]
}

export type AgentHandoff = {
  site: string
  fetched_at: string
  platform?: string | null
  business: Partial<BusinessInfo> & { name: string | null }
  brand_assets?: BrandAsset[]
  routes: AgentHandoffRoute[]
  pages?: AgentHandoffPage[]
  content_fetched_at?: string
  crawl?: AgentHandoffCrawl
}

export function buildAgentHandoff(
  summary: SiteSummary,
  content?: SiteContent | null,
): AgentHandoff {
  const routes = routesFromSummary(summary)
  const hasContent = content != null && Object.keys(content.pages).length > 0

  const handoff: AgentHandoff = {
    site: summary.meta.url,
    fetched_at: summary.meta.fetched_at,
    business: compactBusiness(summary.business),
    routes,
  }

  const platform = summary.site_plan.platform
  if (platform) handoff.platform = platform

  const brandAssets = summary.brand_assets ?? []
  if (brandAssets.length) handoff.brand_assets = brandAssets

  if (hasContent && content) {
    handoff.content_fetched_at = content.fetched_at
    handoff.pages = pagesFromContent(content, routes)
  } else {
    handoff.crawl = compactCrawl(summary)
  }

  return stripEmpty(handoff) as AgentHandoff
}

function routesFromSummary(summary: SiteSummary): AgentHandoffRoute[] {
  return Object.entries(summary.site_plan.routes)
    .map(([path, route]) => {
      const entry: AgentHandoffRoute = { path, label: route.label }
      const title = route.title?.trim()
      if (title && title !== route.label) entry.title = title
      return entry
    })
    .sort((a, b) => compareRoutePath(a.path, b.path))
}

function pagesFromContent(
  content: SiteContent,
  routes: AgentHandoffRoute[],
): AgentHandoffPage[] {
  const order = new Map(routes.map((r, i) => [r.path, i]))
  const paths = Object.keys(content.pages).sort((a, b) => {
    const ai = order.get(a) ?? 999
    const bi = order.get(b) ?? 999
    if (ai !== bi) return ai - bi
    return compareRoutePath(a, b)
  })

  const pages: AgentHandoffPage[] = []
  for (const path of paths) {
    const page = content.pages[path]
    if (!page) continue
    const entry = pageToHandoff(path, page)
    if (entry) pages.push(entry)
  }
  return pages
}

function pageToHandoff(path: string, page: PageContent): AgentHandoffPage | null {
  const h1 = page.h1?.trim() || null
  const headings = dedupeHeadings(h1, page.headings)
  const body = mergeSections(page.sections)
  const ctas = uniqueNonEmpty(page.ctas)

  if (!h1 && !headings.length && !body && !ctas.length) return null

  const entry: AgentHandoffPage = { path, h1 }
  if (headings.length) entry.headings = headings
  if (body) entry.body = body
  if (ctas.length) entry.ctas = ctas
  return entry
}

function mergeSections(sections: ContentSection[]): string {
  const chunks: string[] = []
  for (const section of sections) {
    const parts: string[] = []
    const heading = section.heading?.trim()
    const text = section.text?.trim()
    if (heading) parts.push(heading)
    if (text) parts.push(text)
    const bullets = section.bullets?.map((b) => b.trim()).filter(Boolean) ?? []
    if (bullets.length) {
      parts.push(bullets.map((b) => `- ${b}`).join('\n'))
    }
    const block = parts.join('\n\n').trim()
    if (block) chunks.push(block)
  }
  return chunks.join('\n\n').trim()
}

function dedupeHeadings(h1: string | null, headings: string[]): string[] {
  const seen = new Set<string>()
  const h1Key = h1 ? normalizeHeading(h1) : null
  const out: string[] = []
  for (const raw of headings) {
    const h = raw.trim()
    if (!h) continue
    const key = normalizeHeading(h)
    if (h1Key && key === h1Key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
  }
  return out
}

function normalizeHeading(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ')
}

function compactBusiness(business: BusinessInfo): AgentHandoff['business'] {
  const out: AgentHandoff['business'] = { name: business.name }
  if (business.phones.length) out.phones = [...new Set(business.phones)]
  if (business.emails.length) out.emails = business.emails
  if (business.address?.trim()) out.address = business.address.trim()
  if (business.social_links.length) out.social_links = business.social_links
  return out
}

function compactCrawl(summary: SiteSummary): AgentHandoffCrawl {
  const crawl = summary.crawl
  const out: AgentHandoffCrawl = { browser: crawl.browser }
  if (crawl.suggest_browser) out.suggest_browser = true
  if (crawl.blockers.length) out.blockers = crawl.blockers
  return out
}

function compareRoutePath(a: string, b: string): number {
  if (a === '/') return -1
  if (b === '/') return 1
  return a.localeCompare(b)
}

function uniqueNonEmpty(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const s = raw.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

/** Drop null, undefined, empty strings, empty arrays, and empty objects. */
function stripEmpty<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    return (value.trim() === '' ? undefined : value) as T
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => stripEmpty(item))
      .filter((item) => item !== undefined && item !== null)
    return (items.length === 0 ? undefined : items) as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripEmpty(child)
      if (cleaned === undefined || cleaned === null) continue
      if (typeof cleaned === 'object' && !Array.isArray(cleaned)) {
        if (Object.keys(cleaned as object).length === 0) continue
      }
      out[key] = cleaned
    }
    return (Object.keys(out).length === 0 ? undefined : out) as T
  }
  return value
}
