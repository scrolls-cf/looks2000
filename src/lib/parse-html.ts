import type {
  AssetInfo,
  ContentSection,
  EmbedInfo,
  PlatformInfo,
} from './analyze-types'
import { extractBusiness, extractPoweredBy } from './extract-business'
import {
  cleanExtractedText,
  isJunkBullet,
  isJunkHeading,
  prepareHtmlForContentExtract,
} from './content-sanitize'

const PLATFORM_PATTERNS: { id: string; patterns: RegExp[] }[] = [
  { id: 'wix', patterns: [/wixstatic\.com/i, /wix\.com/i, /X-Wix/i] },
  {
    id: 'squarespace',
    patterns: [/squarespace\.com/i, /squarespace-cdn/i, /static1\.squarespace/i],
  },
  { id: 'webflow', patterns: [/webflow\.io/i, /webflow\.com/i, /data-wf-/i] },
  { id: 'godaddy', patterns: [/wsimg\.com/i, /godaddysites\.com/i, /multiscreensite\.com/i],
  },
  { id: 'wordpress', patterns: [/wp-content\//i, /wp-includes\//i] },
]

const TRACKING_IMG =
  /(?:facebook\.com\/tr|google-analytics|googletagmanager|doubleclick|pixel\.)/i

export type ParsedPage = {
  platform: PlatformInfo | null
  hosting: { powered_by: string | null }
  content: {
    title: string
    meta_description: string
    tagline: string
    navigation: string[]
    headings: string[]
    sections: ContentSection[]
    structured_data: unknown[]
  }
  assets: AssetInfo[]
  embeds: EmbedInfo[]
  limitations: string[]
  business: ReturnType<typeof extractBusiness>
}

export function parseHtmlDocument(
  html: string,
  finalUrl: string,
  _requestedUrl: string,
): ParsedPage {
  const head = html.slice(0, Math.min(html.length, 80_000))
  const structured_data = extractJsonLd(html)

  const title = decodeEntities(extractTagText(html, 'title') || '')
  const metaDescription = decodeEntities(
    extractMetaContent(head, 'description') ||
      extractMetaProperty(head, 'og:description') ||
      '',
  )
  const tagline = decodeEntities(
    extractMetaProperty(head, 'og:title') ||
      extractFirstHeading(html, 'h1') ||
      extractFirstHeading(html, 'h2') ||
      '',
  )

  const platform = detectPlatform(html, head)
  const limitations: string[] = ['static_html_only']
  if (platform && ['wix', 'squarespace', 'webflow', 'godaddy'].includes(platform.id)) {
    limitations.push('js_heavy_platform')
  }
  if (html.length < 800) {
    limitations.push('thin_html_body')
  }

  return {
    platform,
    hosting: { powered_by: extractPoweredBy(html) },
    content: {
      title: title.trim(),
      meta_description: metaDescription.trim(),
      tagline: tagline.trim(),
      navigation: extractNavigation(html),
      headings: extractHeadings(html),
      sections: extractSections(html),
      structured_data,
    },
    assets: extractAssets(html, finalUrl),
    embeds: extractEmbeds(html, finalUrl),
    limitations,
    business: extractBusiness(html, structured_data),
  }
}

function detectPlatform(html: string, head: string): PlatformInfo | null {
  const blob = `${head}\n${html.slice(0, 50_000)}`
  for (const { id, patterns } of PLATFORM_PATTERNS) {
    const evidence: string[] = []
    for (const p of patterns) {
      const m = blob.match(p)
      if (m) evidence.push(m[0].slice(0, 80))
    }
    if (evidence.length > 0) {
      return {
        id,
        confidence: evidence.length >= 2 ? 'high' : 'medium',
        evidence: [...new Set(evidence)].slice(0, 5),
      }
    }
  }
  return null
}

function extractTagText(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

function extractFirstHeading(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

function extractMetaContent(head: string, name: string): string {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  const m = re.exec(head)
  if (m) return m[1]
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`,
    'i',
  )
  return re2.exec(head)?.[1] ?? ''
}

function extractMetaProperty(head: string, prop: string): string {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  const m = re.exec(head)
  if (m) return m[1]
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
    'i',
  )
  return re2.exec(head)?.[1] ?? ''
}

function extractNavigation(html: string): string[] {
  const blocks = [
    extractTagOuter(html, 'nav'),
    extractAttrBlock(html, 'role', 'navigation'),
    html.slice(0, 80_000),
  ].filter(Boolean)
  const labels: string[] = []
  for (const block of blocks) {
    const re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(block)) && labels.length < 32) {
      const text = decodeEntities(stripTags(m[1])).replace(/\s+/g, ' ').trim()
      if (text.length < 2 || text.length > 80) continue
      if (/^(button|submit|#|javascript:)/i.test(text)) continue
      if (/^https?:\/\//i.test(text)) continue
      if (!labels.includes(text)) labels.push(text)
    }
  }
  return labels
}

function extractAttrBlock(html: string, attr: string, value: string): string {
  const re = new RegExp(
    `<[a-z][^>]*${attr}=["']${value}["'][^>]*>([\\s\\S]*?)</[a-z]+>`,
    'i',
  )
  return re.exec(html)?.[0] ?? ''
}

function extractHeadings(html: string): string[] {
  const prepared = prepareHtmlForContentExtract(html)
  const out: string[] = []
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(prepared)) && out.length < 24) {
    const text = cleanExtractedText(decodeEntities(stripTags(m[1])))
    if (text.length < 2 || text.length > 160) continue
    if (isJunkHeading(text)) continue
    const key = text.toLowerCase()
    if (!out.some((h) => h.toLowerCase() === key)) out.push(text)
  }
  return out
}

function extractTagOuter(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  return re.exec(html)?.[0] ?? ''
}

function extractSections(html: string): ContentSection[] {
  const prepared = prepareHtmlForContentExtract(html)
  const sections: ContentSection[] = []
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>([\s\S]{0,4000}?)(?=<h[123]\b|$)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(prepared)) && sections.length < 12) {
    const heading = cleanExtractedText(decodeEntities(stripTags(m[2])))
    if (!heading || isJunkHeading(heading)) continue
    const block = m[3]
    const text = cleanExtractedText(decodeEntities(stripTags(block)))
    const bullets: string[] = []
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let li: RegExpExecArray | null
    while ((li = liRe.exec(block)) && bullets.length < 12) {
      const t = cleanExtractedText(decodeEntities(stripTags(li[1])))
      if (t.length >= 2 && t.length <= 200 && !isJunkBullet(t)) bullets.push(t)
    }
    if (!text && bullets.length === 0) continue
    sections.push({ heading, text, bullets })
  }
  return sections
}

function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 8) {
    try {
      out.push(JSON.parse(m[1].trim()))
    } catch {
      // skip invalid blocks
    }
  }
  return out
}

function extractAssets(html: string, baseUrl: string): AssetInfo[] {
  const assets: AssetInfo[] = []
  const re = /<img\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && assets.length < 20) {
    const tag = m[0]
    const src = getAttr(tag, 'src')
    if (!src || src.startsWith('data:')) continue
    const abs = resolveUrl(src, baseUrl)
    if (!abs || TRACKING_IMG.test(abs)) continue
    const alt = getAttr(tag, 'alt') || ''
    const role = guessAssetRole(tag, alt, abs, assets.length)
    assets.push({ role, url: abs, alt: decodeEntities(alt).slice(0, 200) })
  }
  return assets
}

function extractEmbeds(html: string, baseUrl: string): EmbedInfo[] {
  const embeds: EmbedInfo[] = []
  const re = /<iframe\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && embeds.length < 10) {
    const src = getAttr(m[0], 'src')
    if (!src) continue
    const abs = resolveUrl(src, baseUrl)
    if (!abs) continue
    embeds.push({ kind: 'iframe', src: abs })
  }
  return embeds
}

function guessAssetRole(
  tag: string,
  alt: string,
  url: string,
  index: number,
): AssetInfo['role'] {
  const hay = `${tag} ${alt} ${url}`.toLowerCase()
  if (/logo/.test(hay)) return 'logo'
  if (/wixstatic.*logo|\/logo/i.test(url)) return 'logo'
  if (/hero|banner|header/.test(hay)) return 'hero'
  if (index === 0) return 'hero'
  return 'gallery'
}

function getAttr(tag: string, name: string): string {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')
  return re.exec(tag)?.[1] ?? ''
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

function stripTags(s: string): string {
  return cleanExtractedText(s.replace(/<[^>]+>/g, ' '))
}

/** Paragraph-level copy when h2/section pairing is empty (common on Wix). */
export function extractParagraphCopy(html: string): string[] {
  const prepared = prepareHtmlForContentExtract(html)
  const out: string[] = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(prepared)) && out.length < 16) {
    const t = cleanExtractedText(decodeEntities(stripTags(m[1])))
    if (t.length < 35 || t.length > 900) continue
    if (out.some((x) => x.toLowerCase() === t.toLowerCase())) continue
    out.push(t)
  }
  return out
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
