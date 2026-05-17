import type { SiteSummary } from './analyze-types'
import { readBrowserBudgetStatus, recordBrowserMsUsed } from './browser-budget'
import {
  budgetPeriodKey,
  parseBrowserRenderingPlan,
} from './browser-rendering-config'
import { fetchRenderedHtml } from './browser-rendering-client'
import { routeUrlsFromPaths } from './crawl-policy'
import type { SiteContent } from './page-content'
import { filterContextFromSummary, pageContentFromHtml } from './page-content'
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
        'Cloudflare API token missing (Secrets Store devscrolls_repo_factory_operator_cloudflare_api_token or CLOUDFLARE_API_TOKEN). Token needs Browser Rendering write.',
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
  const pages: SiteContent['pages'] = {}
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
      break
    }

    const rendered = await fetchRenderedHtml(accountId, apiToken, guard.url.href)
    if (!rendered.ok) {
      if (path === '/') {
        return {
          ok: false,
          error: rendered.error,
          message: `Homepage Browser Rendering failed: ${rendered.message}`,
        }
      }
      continue
    }

    sessionMs += rendered.browser_ms_used
    await recordBrowserMsUsed(env.BROWSER_USAGE, plan, period, rendered.browser_ms_used)

    const parsed = parseHtmlDocument(rendered.html, guard.url.href, guard.url.href)
    pages[path] = pageContentFromHtml(guard.url.href, rendered.html, parsed, filterCtx)
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
      },
    },
  }
}

async function resolveBrowserRenderingToken(env: {
  devscrolls_repo_factory_operator_cloudflare_api_token?: SecretsStoreSecret
  CLOUDFLARE_API_TOKEN?: string
}): Promise<string | null> {
  const fromStore = env.devscrolls_repo_factory_operator_cloudflare_api_token
  if (fromStore) {
    try {
      const v = await fromStore.get()
      const t = String(v ?? '').trim()
      if (t) return t
    } catch {
      /* fall through */
    }
  }
  const direct = String(env.CLOUDFLARE_API_TOKEN ?? '').trim()
  return direct || null
}
