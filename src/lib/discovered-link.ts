export type DiscoveredLink = {
  href: string
  absolute_url: string
  path: string
  label: string
}

export type RankedLink = DiscoveredLink & {
  score: number
  reasons: string[]
}

export type SkippedLink = {
  url: string
  reason: string
}
