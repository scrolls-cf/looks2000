import type { DiscoveredLink } from './discovered-link'
import { labelFromPath } from './path-label'

/**
 * Build link records from streamed href list + regex labels on truncated HTML.
 */
export function discoverLinksFromHtml(
  html: string,
  baseUrl: string,
  streamedHrefs: string[] = [],
): DiscoveredLink[] {
  const base = new URL(baseUrl)
  const hrefs = streamedHrefs

  const byUrl = new Map<string, DiscoveredLink>()
  for (const href of hrefs) {
    const resolved = resolveLink(href, base, '')
    if (resolved && !byUrl.has(resolved.absolute_url)) {
      byUrl.set(resolved.absolute_url, resolved)
    }
  }

  for (const link of discoverLinksFromRegex(html, base)) {
    const existing = byUrl.get(link.absolute_url)
    if (!existing) {
      byUrl.set(link.absolute_url, link)
      continue
    }
    if (link.label.length > existing.label.length) {
      byUrl.set(link.absolute_url, link)
    }
  }

  return [...byUrl.values()]
}

function resolveLink(
  href: string,
  base: URL,
  label: string,
): DiscoveredLink | null {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  if (/^(javascript:|mailto:|tel:|data:)/i.test(trimmed)) return null

  let absolute: URL
  try {
    absolute = new URL(trimmed, base)
  } catch {
    return null
  }
  if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') return null

  absolute.hash = ''
  const path =
    absolute.pathname.length > 1
      ? absolute.pathname.replace(/\/+$/, '') || '/'
      : '/'

  const resolvedLabel = label.length > 0 ? label : labelFromPath(path)
  return {
    href: trimmed,
    absolute_url: absolute.href,
    path,
    label: resolvedLabel,
  }
}

function discoverLinksFromRegex(html: string, base: URL): DiscoveredLink[] {
  const out: DiscoveredLink[] = []
  const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 120) {
    const label = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const resolved = resolveLink(m[1], base, label)
    if (resolved) out.push(resolved)
  }
  return out
}
