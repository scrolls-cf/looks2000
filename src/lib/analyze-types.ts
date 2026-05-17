/** Public API: site plan + contact for Worker resale. */

import type { CrawlInfo } from './crawl-policy'

export type { CrawlInfo }

export type BusinessInfo = {
  name: string | null
  phones: string[]
  emails: string[]
  address: string | null
  social_links: string[]
}

/** Nav route keyed by path (e.g. `/`, `/about`). */
export type SitePlanRoutes = Record<
  string,
  {
    label: string
    /** Page `<title>` when useful for section hints. */
    title?: string
  }
>

/** Brand image URL (logo, favicon, og:image, hero) for rebuild handoff. */
export type BrandAsset = {
  role: 'logo' | 'favicon' | 'og_image' | 'hero'
  url: string
}

export type SiteSummary = {
  meta: {
    /** Canonical site URL after redirects. */
    url: string
    fetched_at: string
    /** Present only when the input URL differed from `url`. */
    redirect_from?: string
  }
  business: BusinessInfo
  /** Logo / favicon / social preview / hero image URLs from static crawl. */
  brand_assets: BrandAsset[]
  site_plan: {
    platform: string | null
    routes: SitePlanRoutes
  }
  /**
   * True when static HTML included real page copy (not just titles).
   * False on Wix/JS shells — browser pass may fill `content`.
   */
  has_page_copy: boolean
  /** Static-phase crawl policy; browser pass runs when `browser` is `available`. */
  crawl: CrawlInfo
}

export type AnalyzeSuccess = {
  ok: true
  summary: SiteSummary
}

export type AnalyzeFailure = {
  ok: false
  error: string
  message?: string
}

/** Internal parse types (not returned in summary). */
export type ContentSection = {
  heading: string
  text: string
  bullets: string[]
}

export type AssetInfo = {
  role: 'logo' | 'hero' | 'gallery' | 'unknown'
  url: string
  alt: string
}

export type PlatformInfo = {
  id: string
  confidence: 'low' | 'medium' | 'high'
  evidence: string[]
}

export type EmbedInfo = {
  kind: 'iframe'
  src: string
}
