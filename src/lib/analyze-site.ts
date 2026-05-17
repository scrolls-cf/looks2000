import type {
  AnalyzeFailure,
  AnalyzeSuccess,
  SitePlanRoutes,
  SiteSummary,
} from './analyze-types'
import type { ContentSection } from './analyze-types'
import { discoverLinksFromHtml } from './extract-links-rewriter'
import { fetchPage } from './fetch-page'
import { mergeBusinessInfo } from './merge-business'
import { parseHtmlDocument } from './parse-html'
import { rankLinksForCrawl } from './rank-links'
import { labelFromPath } from './path-label'
import { validatePublicHttpUrl } from './url-guard'
import { assessCrawlPolicy } from './crawl-policy'
import { collectBrandAssetsFromPage, mergeBrandAssets } from './brand-assets'

type ParsedSnapshot = {
  path: string
  label: string
  title: string
  headings: string[]
  sections: ContentSection[]
}

export async function analyzeSite(site: string): Promise<AnalyzeSuccess | AnalyzeFailure> {
  const guard = validatePublicHttpUrl(site)
  if (!guard.ok) {
    return { ok: false, error: guard.error, message: guard.message }
  }

  const requestedUrl = guard.url.href
  const fetched = await fetchPage(guard.url)
  if (!fetched.ok) {
    return { ok: false, error: fetched.error, message: fetched.message }
  }

  const siteOrigin = new URL(fetched.finalUrl)
  const homepage = parseHtmlDocument(fetched.html, fetched.finalUrl, requestedUrl)

  let business = { ...homepage.business }
  if (!business.name && homepage.content.title) {
    business.name = homepage.content.title.split('|')[0].trim() || homepage.content.title
  }

  const discovered = discoverLinksFromHtml(
    fetched.html,
    fetched.finalUrl,
    fetched.hrefs,
  )
  const { toFetch } = rankLinksForCrawl(discovered, siteOrigin, fetched.finalUrl)

  const snapshots: ParsedSnapshot[] = [snapshotFromParsed('/', 'Home', homepage)]
  const brandCandidates = collectBrandAssetsFromPage(
    fetched.html,
    fetched.finalUrl,
    homepage.assets,
    homepage.content.structured_data,
  )

  for (const link of toFetch) {
    let target: URL
    try {
      target = new URL(link.absolute_url)
    } catch {
      continue
    }
    const guardPage = validatePublicHttpUrl(target.href)
    if (!guardPage.ok) continue

    const pageFetch = await fetchPage(guardPage.url)
    if (!pageFetch.ok) continue

    const parsed = parseHtmlDocument(
      pageFetch.html,
      pageFetch.finalUrl,
      link.absolute_url,
    )
    business = mergeBusinessInfo(business, parsed)
    brandCandidates.push(
      ...collectBrandAssetsFromPage(
        pageFetch.html,
        pageFetch.finalUrl,
        parsed.assets,
        parsed.content.structured_data,
      ),
    )
    snapshots.push(
      snapshotFromParsed(link.path, link.label || labelFromPath(link.path), parsed),
    )
  }

  const meta: SiteSummary['meta'] = {
    url: fetched.finalUrl,
    fetched_at: new Date().toISOString(),
  }
  if (normalizeUrlKey(requestedUrl) !== normalizeUrlKey(fetched.finalUrl)) {
    meta.redirect_from = requestedUrl
  }

  const hasPageCopy = snapshots.some((s) => pageHasCopy(s))
  const routes = buildRoutes(snapshots)

  const crawl = await assessCrawlPolicy({
    siteUrl: fetched.finalUrl,
    homepagePath: '/',
    html: fetched.html,
    xRobotsTag: fetched.xRobotsTag,
    suggestBrowser: !hasPageCopy,
  })

  const brand_assets = mergeBrandAssets(brandCandidates)

  const summary: SiteSummary = {
    meta,
    business: normalizeBusiness(business),
    brand_assets,
    site_plan: {
      platform: homepage.platform?.id ?? null,
      routes,
    },
    has_page_copy: hasPageCopy,
    crawl,
  }

  return { ok: true, summary }
}

function snapshotFromParsed(
  path: string,
  label: string,
  parsed: ReturnType<typeof parseHtmlDocument>,
): ParsedSnapshot {
  return {
    path,
    label,
    title: parsed.content.title.trim(),
    headings: parsed.content.headings,
    sections: parsed.content.sections,
  }
}

function buildRoutes(snapshots: ParsedSnapshot[]): SitePlanRoutes {
  const routes: SitePlanRoutes = {}
  const sorted = [...snapshots].sort((a, b) => {
    if (a.path === '/') return -1
    if (b.path === '/') return 1
    return a.path.localeCompare(b.path)
  })
  for (const s of sorted) {
    const entry: SitePlanRoutes[string] = { label: s.label }
    if (s.title.length > 0) entry.title = s.title
    routes[s.path] = entry
  }
  return routes
}

function pageHasCopy(s: ParsedSnapshot): boolean {
  if (s.headings.length > 0) return true
  return s.sections.some(
    (sec) => sec.text.trim().length > 40 || sec.bullets.length > 0,
  )
}

function normalizeUrlKey(href: string): string {
  try {
    const u = new URL(href)
    u.hash = ''
    const path = u.pathname.replace(/\/+$/, '') || '/'
    return `${u.origin}${path}`.toLowerCase()
  } catch {
    return href.toLowerCase()
  }
}

function normalizeBusiness(business: SiteSummary['business']): SiteSummary['business'] {
  return {
    ...business,
    phones: [...new Set(business.phones)],
    emails: [...new Set(business.emails)],
    social_links: [...new Set(business.social_links)],
  }
}
