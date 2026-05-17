import type { ContentSection } from './analyze-types'
import type { SiteSummary } from './analyze-types'
import {
  buildFilterContextFromSummary,
  cleanRebuildText,
  isJunkRebuildHeading,
  prepareHtmlForRebuildContext,
  sanitizeExtractedNoise,
  shouldDropSection,
  shouldDropText,
  type RebuildFilterContext,
} from './rebuild-context-filter'
import { extractParagraphCopy, parseHtmlDocument, type ParsedPage } from './parse-html'

export type PageContent = {
  url: string
  h1: string | null
  headings: string[]
  sections: ContentSection[]
  ctas: string[]
}

export type RenderingRouteFailure = {
  path: string
  error: string
  message: string
}

export type SiteContent = {
  fetched_at: string
  method: 'browser'
  pages: Record<string, PageContent>
  /** looks2000: optional debug metadata (omitted from agent handoff). */
  rendering?: {
    provider: 'cloudflare_browser_rendering_api'
    session_browser_ms: number
    load_profile: 'static' | 'js_heavy'
    failed_routes?: RenderingRouteFailure[]
  }
}

/** True when extracted page has copy worth including in handoff. */
export function pageContentHasCopy(page: PageContent): boolean {
  if (page.h1?.trim()) return true
  if (page.headings.some((h) => h.trim().length > 0)) return true
  if (page.ctas.some((c) => c.trim().length > 0)) return true
  return page.sections.some(
    (sec) => sec.text.trim().length > 0 || sec.bullets.some((b) => b.trim().length > 0),
  )
}

export function filterContextFromSummary(summary: SiteSummary): RebuildFilterContext {
  return buildFilterContextFromSummary(summary)
}

export function pageContentFromHtml(
  url: string,
  html: string,
  _parsed: ParsedPage,
  ctx: RebuildFilterContext,
): PageContent {
  const prepared = prepareHtmlForRebuildContext(html, ctx.platformId)
  const reparsed = parseHtmlDocument(prepared, url, url)
  const h1 = pickH1(prepared, reparsed, ctx)
  let headings = filterHeadings(reparsed.content.headings, ctx)
  let sections = normalizeSections(reparsed.content.sections, ctx)

  sections = enrichSectionsFromParagraphs(sections, prepared, h1, ctx)
  sections = enrichListPageFromHeadings(sections, headings, h1, ctx)

  headings = filterHeadings(
    [...(h1 ? [h1] : []), ...headings, ...sections.map((s) => s.heading)],
    ctx,
  )

  return {
    url,
    h1,
    headings,
    sections,
    ctas: extractCtas(reparsed, headings, ctx),
  }
}

function pickH1(
  prepared: string,
  parsed: ParsedPage,
  ctx: RebuildFilterContext,
): string | null {
  const re = /<h1[^>]*>([\s\S]*?)<\/h1>/i
  const m = re.exec(prepared)
  const fromTag = m
    ? cleanRebuildText(
        sanitizeExtractedNoise(m[1].replace(/<[^>]+>/g, ' ')),
        ctx,
      )
    : ''
  const h1 =
    fromTag ||
    cleanRebuildText(parsed.content.headings[0] ?? '', ctx) ||
    cleanRebuildText(parsed.content.tagline, ctx) ||
    null
  return h1 && !isJunkRebuildHeading(h1, ctx) ? h1 : null
}

function filterHeadings(headings: string[], ctx: RebuildFilterContext): string[] {
  const out: string[] = []
  for (const raw of headings) {
    const t = cleanRebuildText(raw, ctx)
    if (!t || isJunkRebuildHeading(t, ctx)) continue
    if (!out.some((h) => h.toLowerCase() === t.toLowerCase())) out.push(t)
  }
  return out.slice(0, 24)
}

function normalizeSections(
  sections: ContentSection[],
  ctx: RebuildFilterContext,
): ContentSection[] {
  const out: ContentSection[] = []
  for (const sec of sections) {
    const heading = cleanRebuildText(sec.heading, ctx)
    const text = cleanRebuildText(sec.text, ctx)
    const bullets = sec.bullets
      .map((b) => cleanRebuildText(b, ctx))
      .filter((b) => b.length >= 2 && b.length <= 120 && !shouldDropText(b, ctx))

    const candidate: ContentSection = { heading, text, bullets }
    if (shouldDropSection(candidate, ctx)) continue
    if (!heading && !text && bullets.length === 0) continue
    if (heading && out.some((s) => s.heading.toLowerCase() === heading.toLowerCase())) continue
    out.push({ heading, text, bullets })
  }
  return out.slice(0, 12)
}

function enrichSectionsFromParagraphs(
  sections: ContentSection[],
  prepared: string,
  h1: string | null,
  ctx: RebuildFilterContext,
): ContentSection[] {
  const hasCopy = sections.some(
    (s) => s.text.length > 40 || s.bullets.length > 0,
  )
  if (hasCopy) return sections

  const paras = extractParagraphCopy(prepared)
    .map((p) => cleanRebuildText(p, ctx))
    .filter((p) => p.length >= 35 && !shouldDropText(p, ctx))
  if (paras.length === 0) return sections

  const candidate: ContentSection = {
    heading: h1 || 'main',
    text: paras.slice(0, 4).join(' '),
    bullets: [],
  }
  if (shouldDropSection(candidate, ctx)) return sections
  return [...sections, candidate]
}

function enrichListPageFromHeadings(
  sections: ContentSection[],
  headings: string[],
  h1: string | null,
  ctx: RebuildFilterContext,
): ContentSection[] {
  if (sections.some((s) => s.text.length > 40 || s.bullets.length >= 3)) {
    return sections
  }

  const listItems = headings.filter((h) => {
    if (h === h1) return false
    if (isJunkRebuildHeading(h, ctx)) return false
    return h.length >= 3 && h.length <= 48
  })

  const placeLike = listItems.filter(isPlaceLikeHeading)
  if (placeLike.length < 6 || placeLike.length < listItems.length * 0.65) {
    return sections
  }

  const candidate: ContentSection = {
    heading: h1 || 'list',
    text: '',
    bullets: placeLike.slice(0, 32),
  }
  if (shouldDropSection(candidate, ctx)) return sections

  const out = sections.filter((s) => s.text.length > 0 || s.bullets.length > 0)
  out.push(candidate)
  return out
}

function isPlaceLikeHeading(h: string): boolean {
  const t = h.trim()
  if (/repair|installation|cooling|heating|ductwork|financing|coupon|services|diagnostic/i.test(t)) {
    return false
  }
  if (/^(get a|now offering|about us|contact|our services)/i.test(t)) return false
  return t.length >= 3 && t.length <= 40
}

function extractCtas(
  parsed: ParsedPage,
  headings: string[],
  ctx: RebuildFilterContext,
): string[] {
  const ctas: string[] = []
  const add = (t: string) => {
    const s = cleanRebuildText(t, ctx)
    if (s.length < 3 || s.length > 48) return
    if (shouldDropText(s, ctx) && !/schedule|call|quote|contact|book/i.test(s)) return
    if (!ctas.some((c) => c.toLowerCase() === s.toLowerCase())) ctas.push(s)
  }

  for (const h of headings) {
    if (/schedule|call now|get a quote|request|contact us|book|free quote/i.test(h)) {
      add(h)
    }
  }
  for (const label of parsed.content.navigation) {
    if (/schedule|call|quote|contact|book|apply/i.test(label)) add(label)
  }
  return ctas.slice(0, 8)
}
