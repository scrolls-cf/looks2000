const USER_AGENT = 'looks2000/1.0 (+https://github.com/scrolls-cf/looks2000)'
const ROBOTS_TIMEOUT_MS = 8_000

export type CrawlBlocker = {
  kind: 'robots_txt' | 'meta_robots' | 'x_robots_tag' | 'challenge' | 'note'
  detail: string
  /** When true, do not offer / run the browser pass. */
  blocks_browser: boolean
}

export type CrawlInfo = {
  /** Whether the browser (Puppeteer) pass may run after static analyze. */
  browser: 'available' | 'blocked'
  blockers: CrawlBlocker[]
  /** Static HTML had little copy; browser often helps (e.g. Wix). */
  suggest_browser: boolean
}

export type CrawlPolicyInput = {
  siteUrl: string
  homepagePath: string
  html: string
  xRobotsTag: string | null
  suggestBrowser: boolean
}

export async function assessCrawlPolicy(input: CrawlPolicyInput): Promise<CrawlInfo> {
  const blockers: CrawlBlocker[] = []
  const origin = new URL(input.siteUrl)

  const metaRobots = extractMetaRobots(input.html)
  if (metaRobots) {
    blockers.push({
      kind: 'meta_robots',
      detail: metaRobots,
      blocks_browser: false,
    })
  }

  if (input.xRobotsTag) {
    blockers.push({
      kind: 'x_robots_tag',
      detail: input.xRobotsTag,
      blocks_browser: false,
    })
  }

  if (detectChallengePage(input.html)) {
    blockers.push({
      kind: 'challenge',
      detail: 'Page looks like a bot challenge or interstitial.',
      blocks_browser: true,
    })
  }

  const robotsTxt = await fetchRobotsTxt(origin)
  if (robotsTxt !== null) {
    const disallowed = isDisallowedByRobots(robotsTxt, input.homepagePath, USER_AGENT)
    if (disallowed) {
      blockers.push({
        kind: 'robots_txt',
        detail: disallowed,
        blocks_browser: true,
      })
    }
  }

  const browser = blockers.some((b) => b.blocks_browser) ? 'blocked' : 'available'

  return {
    browser,
    blockers,
    suggest_browser: input.suggestBrowser && browser === 'available',
  }
}

/** Absolute URLs for each `site_plan.routes` key (derived at browser-fetch time). */
export function routeUrlsFromPaths(siteUrl: string, paths: string[]): Record<string, string> {
  const base = new URL(siteUrl)
  const out: Record<string, string> = {}
  const seen = new Set<string>()
  for (const raw of paths) {
    const path = raw.startsWith('/') ? raw : `/${raw}`
    if (seen.has(path)) continue
    seen.add(path)
    if (path === '/') {
      out['/'] = `${base.origin}/`
    } else {
      out[path] = new URL(path, base).href
    }
  }
  return out
}

async function fetchRobotsTxt(origin: URL): Promise<string | null> {
  const url = `${origin.origin}/robots.txt`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain,*/*' },
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const text = await res.text()
    return text.slice(0, 64_000)
  } catch {
    return null
  }
}

function extractMetaRobots(html: string): string | null {
  const head = html.slice(0, 80_000)
  const re = /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i
  const m = re.exec(head)
  if (m) return m[1].trim()
  const re2 = /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i
  return re2.exec(head)?.[1]?.trim() ?? null
}

function detectChallengePage(html: string): boolean {
  const sample = html.slice(0, 120_000).toLowerCase()
  if (sample.includes('cf-browser-verification')) return true
  if (sample.includes('challenge-platform')) return true
  if (sample.includes('attention required') && sample.includes('cloudflare')) return true
  if (/<title[^>]*>\s*just a moment/i.test(sample)) return true
  return false
}

/** Returns disallow reason or null if allowed. */
function isDisallowedByRobots(
  robotsBody: string,
  path: string,
  userAgent: string,
): string | null {
  const groups = parseRobotsGroups(robotsBody)
  const ua = userAgent.toLowerCase()
  const star = groups.get('*') ?? []
  const specific =
    [...groups.entries()].find(([key]) => ua.includes(key) || key.includes('looks1999'))?.[1] ??
    []
  const rules = [...star, ...specific]
  const normalized = path === '' ? '/' : path
  for (const rule of rules) {
    if (rule.type === 'disallow' && rule.path !== '' && pathMatches(normalized, rule.path)) {
      return `Disallow: ${rule.path}`
    }
  }
  return null
}

type RobotsRule = { type: 'allow' | 'disallow'; path: string }

function parseRobotsGroups(body: string): Map<string, RobotsRule[]> {
  const map = new Map<string, RobotsRule[]>()
  let currentAgents: string[] = []

  for (const line of body.split('\n')) {
    const trimmed = line.split('#')[0]?.trim() ?? ''
    if (!trimmed) continue
    const m = /^([^:]+):\s*(.*)$/.exec(trimmed)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()

    if (key === 'user-agent') {
      currentAgents = [value.toLowerCase()]
      if (!map.has(value.toLowerCase())) map.set(value.toLowerCase(), [])
      continue
    }
    if (key !== 'allow' && key !== 'disallow') continue

    for (const agent of currentAgents) {
      const list = map.get(agent) ?? []
      list.push({ type: key, path: value })
      map.set(agent, list)
    }
  }
  return map
}

function pathMatches(requestPath: string, rulePath: string): boolean {
  if (rulePath === '/') return true
  return requestPath.startsWith(rulePath)
}
