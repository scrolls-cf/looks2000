import { readBrowserBudgetStatus } from './browser-budget'
import type { CrawlInfo } from './crawl-policy'

/** When Browser Rendering budget is gone, mirror looks1999 blocked browser UX. */
export async function applyRenderingBudgetToCrawl(
  env: {
    BROWSER_RENDERING_ENABLED?: string
    BROWSER_RENDERING_PLAN?: string
    BROWSER_USAGE?: KVNamespace
  },
  crawl: CrawlInfo,
): Promise<CrawlInfo> {
  if (crawl.browser === 'blocked') return crawl

  const budget = await readBrowserBudgetStatus(env)
  if (budget.available) return crawl

  return {
    browser: 'blocked',
    suggest_browser: false,
    blockers: [
      ...crawl.blockers,
      {
        kind: 'note',
        detail: budget.reason ?? 'Browser Rendering budget exhausted.',
        blocks_browser: true,
      },
    ],
  }
}
