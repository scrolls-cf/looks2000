import type { Context } from 'hono'
import { applyRenderingBudgetToCrawl } from './apply-rendering-budget'
import { buildAgentHandoff } from './agent-handoff'
import { analyzeSite } from './analyze-site'
import { corsAnalyzeHeaders, parseSummaryQuerySite } from './analyze-http'

const cors = corsAnalyzeHeaders

export async function respondSitePlanJson(c: Context): Promise<Response> {
  const parsed = parseSummaryQuerySite(c.req.query('site'))
  if (!parsed.ok) {
    return c.json({ ok: false, error: parsed.error, message: parsed.message }, 400, cors)
  }
  const result = await analyzeSite(parsed.site)
  if (!result.ok) {
    const status =
      result.error === 'blocked_host' || result.error === 'invalid_url'
        ? 400
        : result.error === 'not_html'
          ? 422
          : 502
    return c.json(result, status, cors)
  }
  result.summary.crawl = await applyRenderingBudgetToCrawl(c.env, result.summary.crawl)
  return c.json(
    {
      ok: true,
      handoff: buildAgentHandoff(result.summary),
      summary: result.summary,
    },
    200,
    cors,
  )
}
