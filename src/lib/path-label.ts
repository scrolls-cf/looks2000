export function labelFromPath(path: string): string {
  if (path === '/' || path === '') return 'Home'
  const slug = path.replace(/^\/+|\/+$/g, '').split('/')[0]
  if (!slug) return 'Home'
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
