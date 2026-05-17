import { isLocalDevHost } from './is-local-dev-host'

const LOCAL_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

/** Production browser traffic is same-origin via scrollsmatrix; no wildcard CORS. */
export function corsHeadersForRequest(request: Request): Record<string, string> {
  const url = new URL(request.url)
  if (isLocalDevHost(url.hostname)) {
    return { ...LOCAL_CORS }
  }
  return {}
}
