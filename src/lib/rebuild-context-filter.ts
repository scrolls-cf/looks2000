import type { ContentSection } from './analyze-types'
import type { SiteSummary } from './analyze-types'
import { DROP_FOR_SITE_REBUILD_CONTEXT } from './rebuild-context-rules'

export type RebuildFilterContext = {
  platformId: string | null
  /** Exact lowercase strings already in summary — skip duplicate lines in content. */
  skipTexts: Set<string>
}

const JUNK_UI_RE = buildJunkUiRegex()

const CHROME_TAGS = ['nav', 'header', 'footer', 'aside'] as const

const ALWAYS_DROP_TAGS = DROP_FOR_SITE_REBUILD_CONTEXT.tags.filter(
  (t) => !CHROME_TAGS.includes(t as (typeof CHROME_TAGS)[number]),
)

const JS_HEAVY_PLATFORMS = new Set([
  'wix',
  'squarespace',
  'webflow',
  'godaddy',
])

function buildJunkUiRegex(): RegExp {
  const parts = DROP_FOR_SITE_REBUILD_CONTEXT.junk_ui.map((j) =>
    j.replace(/_/g, '[_-]?'),
  )
  return new RegExp(
    `(?:class|id|data-testid|data-hook|role)=["'][^"']*(?:${parts.join('|')})[^"']*["']`,
    'i',
  )
}

export function buildFilterContextFromSummary(summary: SiteSummary): RebuildFilterContext {
  const skipTexts = new Set<string>()

  const add = (raw: string | null | undefined) => {
    const t = normalizeSkipKey(raw)
    if (t) skipTexts.add(t)
  }

  add(summary.business.name)
  add(summary.business.address)
  for (const p of summary.business.phones) {
    add(p)
    const digits = p.replace(/\D/g, '')
    if (digits.length >= 10) add(digits)
  }
  for (const e of summary.business.emails) add(e)
  for (const s of summary.business.social_links) add(s)

  for (const route of Object.values(summary.site_plan.routes)) {
    if (route.title && route.title.trim().length >= 18) {
      add(route.title)
      for (const part of route.title.split('|')) {
        const p = part.trim()
        if (p.length >= 18) add(p)
      }
    }
  }

  return {
    platformId: summary.site_plan.platform,
    skipTexts,
  }
}

function normalizeSkipKey(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function prepareHtmlForRebuildContext(
  html: string,
  platformId: string | null,
): string {
  let s = html
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')

  for (const tag of ALWAYS_DROP_TAGS) {
    if (tag === 'link' || tag === 'meta') {
      s = s.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), ' ')
    } else {
      s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ')
    }
  }

  if (!platformId || !JS_HEAVY_PLATFORMS.has(platformId)) {
    for (const tag of CHROME_TAGS) {
      s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ')
    }
  }

  s = stripJunkUiBlocks(s)
  s = s.replace(/\sstyle=["'][^"']*["']/gi, ' ')
  s = s.replace(/\sclass=["'][^"']*font_[^"']*["']/gi, ' ')

  return s
}

function stripJunkUiBlocks(html: string): string {
  let s = html
  const blockRe =
    /<(?:div|section|aside|form|ul)[^>]*(?:class|id|data-hook|role)=[^>]*>[\s\S]*?<\/(?:div|section|aside|form|ul)>/gi
  let m: RegExpExecArray | null
  let n = 0
  while ((m = blockRe.exec(html)) && n < 40) {
    if (JUNK_UI_RE.test(m[0])) {
      s = s.replace(m[0], ' ')
      n += 1
    }
  }
  return s
}

export function sanitizeExtractedNoise(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim()
  if (!t) return ''

  t = t.replace(/#comp-[a-z0-9_-]+/gi, ' ')
  t = t.replace(/\[data-[a-z-]+(?:="[^"]*")?\]/gi, ' ')
  t = t.replace(/\{[^{}]{0,400}\}/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()

  if (matchesCssJsNoise(t)) return ''
  return t.slice(0, 1200)
}

export function cleanRebuildText(raw: string, ctx: RebuildFilterContext): string {
  const t = sanitizeExtractedNoise(raw)
  if (!t || shouldDropText(t, ctx)) return ''
  return t
}

function matchesCssJsNoise(t: string): boolean {
  const lower = t.toLowerCase()
  if (/^[#.{}\[\];:\\/|]+$/i.test(t)) return true
  if ((t.match(/#/g) || []).length >= 2 && t.length < 100) return true

  for (const pat of DROP_FOR_SITE_REBUILD_CONTEXT.css_js_patterns) {
    if (lower.includes(pat.toLowerCase())) return true
  }
  if (lower.includes('{') && /fill\s*:|display\s*:|padding\s*:/i.test(lower)) {
    return true
  }

  return false
}

export function shouldDropText(t: string, ctx: RebuildFilterContext): boolean {
  const key = normalizeSkipKey(t)
  if (!key || key.length < 2) return true

  if (ctx.skipTexts.has(key)) return true

  for (const g of DROP_FOR_SITE_REBUILD_CONTEXT.generic_text) {
    if (key === g || key === `${g}.`) return true
  }

  if (isMostlyLegal(t)) return true
  if (isMostlyNavigation(key)) return true

  return false
}

export function isJunkRebuildHeading(text: string, ctx: RebuildFilterContext): boolean {
  const t = sanitizeExtractedNoise(text)
  if (!t || t.length > 140) return true
  if (/^contact us now$/i.test(t)) return true
  if (/^our services$/i.test(t)) return true

  const key = normalizeSkipKey(t)
  if (ctx.skipTexts.has(key)) return true

  for (const g of DROP_FOR_SITE_REBUILD_CONTEXT.generic_text) {
    if (key === g) return true
  }
  return false
}

export function shouldDropSection(
  section: ContentSection,
  ctx: RebuildFilterContext,
): boolean {
  const heading = cleanRebuildText(section.heading, ctx)
  const text = cleanRebuildText(section.text, ctx)
  const bullets = section.bullets
    .map((b) => cleanRebuildText(b, ctx))
    .filter(Boolean)

  if (!heading && !text && bullets.length === 0) return true
  if (heading && isJunkRebuildHeading(heading, ctx) && !text && bullets.length === 0) {
    return true
  }

  if (!text && bullets.length === 0) {
    if (!heading) return true
    if (isJunkRebuildHeading(heading, ctx)) return true
    return false
  }

  const combined = `${heading} ${text} ${bullets.join(' ')}`.trim()
  if (!combined) return true
  if (matchesCssJsNoise(combined)) return true
  if (isMostlyLegal(combined)) return true
  if (isMostlyNavigation(normalizeSkipKey(combined))) return true

  if (text.length > 0 && text.length < 28 && bullets.length === 0) return true

  return false
}

function isMostlyLegal(t: string): boolean {
  const lower = t.toLowerCase()
  if (t.length >= 200) return false
  return /privacy|terms|cookie|gdpr|all rights reserved|disclaimer/.test(lower)
}

function isMostlyNavigation(key: string): boolean {
  if (key.length > 80) return false
  const nav = ['home', 'menu', 'back', 'next', 'previous', 'skip to']
  return nav.some((n) => key === n || key.startsWith(`${n} `))
}
