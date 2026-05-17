/**
 * API paths for fleet apps behind scrollsmatrix /apps/{slug}/ or local wrangler dev at /.
 * @param {string} path e.g. "api/analyze" or "/api/analyze"
 */
export function fleetApiPath(path) {
  const p = path.startsWith('/') ? path.slice(1) : path
  if (/^\/apps\/[^/]+/.test(window.location.pathname)) {
    return p
  }
  return `/${p}`
}
