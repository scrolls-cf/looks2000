import type { Context } from 'hono'
import { buildAgentHandoff } from './agent-handoff'
import { readBrowserBudgetStatus } from './browser-budget'
import { corsAnalyzeHeaders, parseContentRequestBody } from './analyze-http'
import { fetchSiteContentWithBrowserRendering } from './rendering-content'

export async function respondContentJson(c: Context): Promise<Response> {
  const cors = corsAnalyzeHeaders(c.req.raw)
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'json_required', message: 'JSON body required' }, 400, cors)
  }

  const parsed = parseContentRequestBody(body)
  if (!parsed.ok) {
    return c.json({ ok: false, error: parsed.error, message: parsed.message }, 400, cors)
  }

  const budget = await readBrowserBudgetStatus(c.env)
  if (!budget.available) {
    return c.json(
      {
        ok: false,
        error: 'browser_budget_exhausted',
        message: budget.reason ?? 'Browser Rendering budget exhausted.',
        budget,
      },
      503,
      cors,
    )
  }

  const result = await fetchSiteContentWithBrowserRendering(c.env, parsed.summary)
  if (!result.ok) {
    const status =
      result.error === 'browser_blocked' ||
      result.error === 'no_routes' ||
      result.error === 'browser_budget_exhausted'
        ? 400
        : result.error === 'rendering_token_missing' ||
            result.error === 'rendering_config_missing'
          ? 503
          : 502
    return c.json(result, status, cors)
  }

  return c.json(
    {
      ok: true,
      summary: parsed.summary,
      content: result.content,
      handoff: buildAgentHandoff(parsed.summary, result.content),
    },
    200,
    cors,
  )
}
