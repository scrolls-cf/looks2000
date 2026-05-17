import type { SiteSummary } from './analyze-types'
import { readBrowserBudgetStatus, recordBrowserMsUsed } from './browser-budget'
import {
  budgetPeriodKey,
  parseBrowserRenderingPlan,
} from './browser-rendering-config'
import {
  fetchRenderedHtml,
  resolveLoadProfile,
  type BrowserRenderingLoadProfile,
} from './browser-rendering-client'
import { routeUrlsFromPaths } from './crawl-policy'
import type { RenderingRouteFailure, SiteContent } from './page-content'
import { filterContextFromSummary, pageContentFromHtml, pageContentHasCopy } from './page-content'
import { parseHtmlDocument } from './parse-html'
import { validatePublicHttpUrl } from './url-guard'

const MAX_ROUTES = 8

export type RenderingContentResult =
  | { ok: true; content: SiteContent }
  | { ok: false; error: string; message: string }

export async function fetchSiteContentWithBrowserRendering(
  env: {
    CLOUDFLARE_ACCOUNT_ID: string
    BROWSER_RENDERING_ENABLED?: string
    BROWSER_RENDERING_PLAN?: string
    BROWSER_USAGE?: KVNamespace
    devscrolls_repo_factory_operator_cloudflare_api_token?: SecretsStoreSecret
  },
  summary: SiteSummary,
): Promise<RenderingContentResult> {
  const budget = await readBrowserBudgetStatus(env)
  if (!budget.available) {
    return {
      ok: false,
      error: 'browser_budget_exhausted',
      message: budget.reason ?? 'Browser Rendering budget exhausted.',
    }
  }

  if (summary.crawl.browser === 'blocked') {
    return {
      ok: false,
      error: 'browser_blocked',
      message: 'Browser fetch is blocked for this site (see summary.crawl.blockers).',
    }
  }

  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID ?? '').trim()
  if (!accountId) {
    return {
      ok: false,
      error: 'rendering_config_missing',
      message: 'CLOUDFLARE_ACCOUNT_ID is not configured.',
    }
  }

  const apiToken = await resolveBrowserRenderingToken(env)
  if (!apiToken) {
    return {
      ok: false,
      error: 'rendering_token_missing',
      message:
        'Cloudflare API token missing (Secrets Store devscrolls_repo_factory_operator_cloudflare_api_token). Token needs Browser Rendering write.',
    }
  }

  const paths = Object.keys(summary.site_plan.routes)
  const routeUrls = routeUrlsFromPaths(summary.meta.url, paths)
  const entries = Object.entries(routeUrls).slice(0, MAX_ROUTES)
  if (entries.length === 0) {
    return {
      ok: false,
      error: 'no_routes',
      message: 'No routes in site plan to render.',
    }
  }

  const plan = parseBrowserRenderingPlan(env.BROWSER_RENDERING_PLAN)
  const period = budgetPeriodKey(plan)
  const filterCtx = filterContextFromSummary(summary)
  const baseProfile = resolveLoadProfile(
    summary.site_plan.platform,
    summary.has_page_copy,
  )
  const pages: SiteContent['pages'] = {}
  const failedRoutes: RenderingRouteFailure[] = []
  let sessionMs = 0

  for (const [path, url] of entries) {
    const guard = validatePublicHttpUrl(url)
    if (!guard.ok) continue

    const freshBudget = await readBrowserBudgetStatus(env)
    if (!freshBudget.available) {
      if (path === '/' || Object.keys(pages).length === 0) {
        return {
          ok: false,
          error: 'browser_budget_exhausted',
          message: freshBudget.reason ?? 'Browser Rendering budget exhausted.',
        }
      }
      failedRoutes.push({
        path,
        error: 'browser_budget_exhausted',
        message: freshBudget.reason ?? 'Browser Rendering budget exhausted.',
      })
      break
    }

    const fetched = await fetchRouteRenderedPage(
      accountId,
      apiToken,
      guard.url.href,
      baseProfile,
      filterCtx,
    )

    if (!fetched.ok) {
      sessionMs += fetched.browser_ms_used
      if (fetched.browser_ms_used > 0) {
        await recordBrowserMsUsed(env.BROWSER_USAGE, plan, period, fetched.browser_ms_used)
      }
      if (path === '/') {
        return {
          ok: false,
          error: fetched.error,
          message: `Homepage Browser Rendering failed: ${fetched.message}`,
        }
      }
      failedRoutes.push({
        path,
        error: fetched.error,
        message: fetched.message,
      })
      continue
    }

    sessionMs += fetched.browser_ms_used
    await recordBrowserMsUsed(env.BROWSER_USAGE, plan, period, fetched.browser_ms_used)

    if (!pageContentHasCopy(fetched.page)) {
      if (path === '/' && Object.keys(pages).length === 0) {
        return {
          ok: false,
          error: 'rendering_no_copy',
          message: 'Browser Rendering returned HTML but no usable page copy on homepage.',
        }
      }
      failedRoutes.push({
        path,
        error: 'rendering_no_copy',
        message: 'Rendered HTML had no extractable copy after filtering.',
      })
      continue
    }

    pages[path] = fetched.page
  }

  if (Object.keys(pages).length === 0) {
    return {
      ok: false,
      error: 'rendering_no_pages',
      message: 'Browser Rendering returned no usable pages.',
    }
  }

  return {
    ok: true,
    content: {
      fetched_at: new Date().toISOString(),
      method: 'browser',
      pages,
      rendering: {
        provider: 'cloudflare_browser_rendering_api',
        session_browser_ms: sessionMs,
        load_profile: baseProfile,
        ...(failedRoutes.length ? { failed_routes: failedRoutes } : {}),
      },
    },
  }
}

type RouteFetchResult =
  | { ok: true; page: SiteContent['pages'][string]; browser_ms_used: number }
  | { ok: false; error: string; message: string; browser_ms_used: number }

async function fetchRouteRenderedPage(
  accountId: string,
  apiToken: string,
  url: string,
  baseProfile: BrowserRenderingLoadProfile,
  filterCtx: ReturnType<typeof filterContextFromSummary>,
): Promise<RouteFetchResult> {
  let profile = baseProfile
  let rendered = await fetchRenderedHtml(accountId, apiToken, url, profile)
  let totalMs = rendered.ok ? rendered.browser_ms_used : 0

  if (!rendered.ok) {
    return {
      ok: false,
      error: rendered.error,
      message: rendered.message,
      browser_ms_used: totalMs,
    }
  }

  let page = htmlToPageContent(url, rendered.html, filterCtx)

  if (!pageContentHasCopy(page) && profile === 'static') {
    const retry = await fetchRenderedHtml(accountId, apiToken, url, 'js_heavy')
    totalMs += retry.ok ? retry.browser_ms_used : 0
    if (retry.ok) {
      const retried = htmlToPageContent(url, retry.html, filterCtx)
      if (pageContentHasCopy(retried)) {
        page = retried
        profile = 'js_heavy'
      }
    }
  }

  if (!pageContentHasCopy(page)) {
    return {
      ok: false,
      error: 'rendering_no_copy',
      message: `No extractable copy (load profile: ${profile}).`,
      browser_ms_used: totalMs,
    }
  }

  return { ok: true, page, browser_ms_used: totalMs }
}

function htmlToPageContent(
  url: string,
  html: string,
  filterCtx: ReturnType<typeof filterContextFromSummary>,
): SiteContent['pages'][string] {
  const parsed = parseHtmlDocument(html, url, url)
  return pageContentFromHtml(url, html, parsed, filterCtx)
}

async function resolveBrowserRenderingToken(env: {
  devscrolls_repo_factory_operator_cloudflare_api_token?: SecretsStoreSecret
}): Promise<string | null> {
  const fromStore = env.devscrolls_repo_factory_operator_cloudflare_api_token
  if (!fromStore) return null
  try {
    const v = await fromStore.get()
    const t = String(v ?? '').trim()
    return t || null
  } catch {
    return null
  }
}
