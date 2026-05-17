import { corsHeadersForRequest } from './fleet-gateway/cors'

export function corsAnalyzeHeaders(request: Request): Record<string, string> {
  return corsHeadersForRequest(request)
}

export type ParseAnalyzeBodyResult =
  | { ok: true; site: string }
  | { ok: false; error: string; message: string }

export function parseAnalyzeRequestBody(body: unknown): ParseAnalyzeBodyResult {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      error: 'invalid_body',
      message: 'Request body must be a JSON object',
    }
  }
  const rec = body as Record<string, unknown>
  if (typeof rec.site !== 'string') {
    return {
      ok: false,
      error: 'site_required',
      message: 'Field site must be a string URL',
    }
  }
  const site = rec.site.trim()
  if (site.length === 0) {
    return {
      ok: false,
      error: 'site_required',
      message: 'Field site must be non-empty',
    }
  }
  if (site.length > 2048) {
    return {
      ok: false,
      error: 'site_too_long',
      message: 'Field site must be at most 2048 characters',
    }
  }
  return { ok: true, site }
}

export type ParseContentBodyResult =
  | { ok: true; summary: import('./analyze-types').SiteSummary }
  | { ok: false; error: string; message: string }

export function parseContentRequestBody(body: unknown): ParseContentBodyResult {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      error: 'invalid_body',
      message: 'Request body must be a JSON object',
    }
  }
  const rec = body as Record<string, unknown>
  const summary = rec.summary
  if (!summary || typeof summary !== 'object') {
    return {
      ok: false,
      error: 'summary_required',
      message: 'Field summary is required (site plan from POST /api/analyze).',
    }
  }
  const s = summary as Record<string, unknown>
  if (!s.meta || typeof s.meta !== 'object') {
    return { ok: false, error: 'invalid_summary', message: 'summary.meta is required.' }
  }
  if (!s.site_plan || typeof s.site_plan !== 'object') {
    return { ok: false, error: 'invalid_summary', message: 'summary.site_plan is required.' }
  }
  if (!s.crawl || typeof s.crawl !== 'object') {
    return { ok: false, error: 'invalid_summary', message: 'summary.crawl is required.' }
  }
  const sitePlan = s.site_plan as Record<string, unknown>
  const routes = sitePlan.routes
  if (!routes || typeof routes !== 'object' || Object.keys(routes).length === 0) {
    return {
      ok: false,
      error: 'invalid_summary',
      message: 'summary.site_plan.routes must be a non-empty object.',
    }
  }
  if (!Array.isArray(s.brand_assets)) {
    s.brand_assets = []
  }
  return { ok: true, summary: summary as import('./analyze-types').SiteSummary }
}

export function parseSummaryQuerySite(raw: string | undefined): ParseAnalyzeBodyResult {
  if (raw == null || raw.trim().length === 0) {
    return {
      ok: false,
      error: 'site_query_required',
      message: 'Query parameter site is required',
    }
  }
  const site = raw.trim()
  if (site.length > 2048) {
    return {
      ok: false,
      error: 'site_too_long',
      message: 'Query site must be at most 2048 characters',
    }
  }
  return { ok: true, site }
}
