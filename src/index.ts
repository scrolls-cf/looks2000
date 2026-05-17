import { Hono } from 'hono'
import { applyRenderingBudgetToCrawl } from './lib/apply-rendering-budget'
import { buildAgentHandoff } from './lib/agent-handoff'
import { analyzeSite } from './lib/analyze-site'
import { readBrowserBudgetStatus } from './lib/browser-budget'
import {
  corsAnalyzeHeaders,
  parseAnalyzeRequestBody,
} from './lib/analyze-http'
import { respondSitePlanJson } from './lib/site-plan-handler'
import { respondContentJson } from './lib/content-handler'

const app = new Hono<{ Bindings: CloudflareBindings }>()

const cors = corsAnalyzeHeaders

app.get('/health', async (c) => {
  const budget = await readBrowserBudgetStatus(c.env)
  return c.json({
    ok: true,
    service: 'looks2000',
    runtime: 'workers',
    phase2: 'cloudflare_browser_rendering_api',
    browser_rendering: budget,
  })
})

app.options('/api/browser-budget', (c) => c.body(null, 204, cors))
app.get('/api/browser-budget', async (c) => {
  const budget = await readBrowserBudgetStatus(c.env)
  return c.json({ ok: true, budget }, 200, cors)
})

app.options('/api/site-plan', (c) => c.body(null, 204, cors))
app.get('/api/site-plan', (c) => respondSitePlanJson(c))

app.options('/api/site-plan.json', (c) => c.body(null, 204, cors))
app.get('/api/site-plan.json', (c) => respondSitePlanJson(c))

app.options('/api/analyze', (c) => c.body(null, 204, cors))

app.post('/api/analyze', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'json_required', message: 'JSON body required' }, 400, cors)
  }
  const parsed = parseAnalyzeRequestBody(body)
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
      summary: result.summary,
      handoff: buildAgentHandoff(result.summary),
    },
    200,
    cors,
  )
})

app.options('/api/content', (c) => c.body(null, 204, cors))
app.post('/api/content', (c) => respondContentJson(c))

app.options('/api/summary', (c) => c.body(null, 204, cors))
app.get('/api/summary', (c) => respondSitePlanJson(c))

export default {
  fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    return handle(request, env, ctx)
  },
}

async function handle(
  request: Request,
  env: CloudflareBindings,
  ctx: ExecutionContext,
): Promise<Response> {
  const res = await app.fetch(request, env, ctx)
  if (res.status !== 404) return res
  const method = request.method
  if ((method === 'GET' || method === 'HEAD') && env.ASSETS) {
    return env.ASSETS.fetch(request)
  }
  return res
}
