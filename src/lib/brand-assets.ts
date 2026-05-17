import type { AssetInfo, BrandAsset } from './analyze-types'

const TRACKING_IMG =
  /(?:facebook\.com\/tr|google-analytics|googletagmanager|doubleclick|pixel\.)/i

const BRAND_ROLE_RANK: Record<BrandAsset['role'], number> = {
  logo: 0,
  favicon: 1,
  og_image: 2,
  hero: 3,
}

const MAX_BRAND_ASSETS = 12

type BrandAssetCandidate = { role: BrandAsset['role']; url: string }

/** Collect logo / hero / favicon / og:image URLs from one crawled page. */
export function collectBrandAssetsFromPage(
  html: string,
  baseUrl: string,
  imgAssets: AssetInfo[],
  structuredData: unknown[],
): BrandAssetCandidate[] {
  const out: BrandAssetCandidate[] = []
  const head = html.slice(0, 80_000)

  for (const asset of imgAssets) {
    if (asset.role === 'logo' || asset.role === 'hero') {
      out.push({ role: asset.role, url: asset.url })
    } else if (
      asset.role === 'gallery' &&
      /logo|brand|mark/i.test(`${asset.url} ${asset.alt}`)
    ) {
      out.push({ role: 'logo', url: asset.url })
    }
  }

  const ogImage = resolveMetaProperty(head, 'og:image', baseUrl)
  if (ogImage) out.push({ role: 'og_image', url: ogImage })

  const twitterImage = resolveMetaProperty(head, 'twitter:image', baseUrl)
  if (twitterImage && twitterImage !== ogImage) {
    out.push({ role: 'og_image', url: twitterImage })
  }

  for (const rel of ['icon', 'shortcut icon', 'apple-touch-icon'] as const) {
    const href = resolveLinkRel(head, rel, baseUrl)
    if (href) out.push({ role: 'favicon', url: href })
  }

  for (const url of logosFromJsonLd(structuredData, baseUrl)) {
    out.push({ role: 'logo', url })
  }

  return out
}

/** Dedupe by URL; keep the highest-priority role per URL. */
export function mergeBrandAssets(candidates: Iterable<BrandAssetCandidate>): BrandAsset[] {
  const byUrl = new Map<string, BrandAsset>()

  for (const c of candidates) {
    const url = c.url.trim()
    if (!url || url.startsWith('data:')) continue
    if (TRACKING_IMG.test(url)) continue
    if (!/^https?:\/\//i.test(url)) continue

    const existing = byUrl.get(url)
    if (!existing || BRAND_ROLE_RANK[c.role] < BRAND_ROLE_RANK[existing.role]) {
      byUrl.set(url, { role: c.role, url })
    }
  }

  return [...byUrl.values()]
    .sort((a, b) => BRAND_ROLE_RANK[a.role] - BRAND_ROLE_RANK[b.role])
    .slice(0, MAX_BRAND_ASSETS)
}

function resolveMetaProperty(head: string, prop: string, baseUrl: string): string | null {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  let content = re.exec(head)?.[1]
  if (!content) {
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
      'i',
    )
    content = re2.exec(head)?.[1]
  }
  if (!content?.trim()) return null
  return resolveUrl(content.trim(), baseUrl)
}

function resolveLinkRel(head: string, rel: string, baseUrl: string): string | null {
  const re = new RegExp(
    `<link[^>]+rel=["'][^"']*${escapeRegExp(rel)}[^"']*["'][^>]+href=["']([^"']+)["']`,
    'i',
  )
  let href = re.exec(head)?.[1]
  if (!href) {
    const re2 = new RegExp(
      `<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${escapeRegExp(rel)}[^"']*["']`,
      'i',
    )
    href = re2.exec(head)?.[1]
  }
  if (!href?.trim()) return null
  return resolveUrl(href.trim(), baseUrl)
}

function logosFromJsonLd(blocks: unknown[], baseUrl: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  walkJsonLd(blocks, (node) => {
    const type = String(node['@type'] ?? '')
    if (
      !/LocalBusiness|Organization|Store|ProfessionalService|HomeAndConstructionBusiness/i.test(
        type,
      )
    ) {
      return
    }
    for (const raw of [node.logo, node.image]) {
      for (const url of imageUrlsFromLdValue(raw, baseUrl)) {
        if (!seen.has(url)) {
          seen.add(url)
          out.push(url)
        }
      }
    }
  })

  return out
}

function imageUrlsFromLdValue(value: unknown, baseUrl: string): string[] {
  if (typeof value === 'string') {
    const u = resolveUrl(value, baseUrl)
    return u ? [u] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => imageUrlsFromLdValue(item, baseUrl))
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    if (typeof rec.url === 'string') {
      const u = resolveUrl(rec.url, baseUrl)
      return u ? [u] : []
    }
    if (typeof rec.contentUrl === 'string') {
      const u = resolveUrl(rec.contentUrl, baseUrl)
      return u ? [u] : []
    }
  }
  return []
}

function walkJsonLd(
  node: unknown,
  visit: (n: Record<string, unknown>) => void,
): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, visit)
    return
  }
  const rec = node as Record<string, unknown>
  visit(rec)
  if (Array.isArray(rec['@graph'])) {
    for (const item of rec['@graph']) walkJsonLd(item, visit)
  }
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
