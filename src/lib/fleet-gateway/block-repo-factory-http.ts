import { isLocalDevHost } from './is-local-dev-host'
const BLOCKED_PREFIXES = [
  '/api/intake',
  '/api/fork',
  '/api/stage/',
  '/api/delete-repo',
  '/api/rollback-intake',
  '/api/org-repos',
]

/** repo-factory: intake HTTP only on loopback; production uses RPC + scrollsmatrix gateway. */
export function blockRepoFactoryIntakeHttp(
  request: Request,
  env: { ENVIRONMENT?: string },
): Response | null {
  const url = new URL(request.url)
  if (isLocalDevHost(url.hostname)) {
    return null
  }
  const path = url.pathname
  if (path === '/health' || path === '/json/in' || path === '/json/out') {
    return null
  }
  if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }
  return null
}
