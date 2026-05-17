import { FLEET_GATEWAY_HEADER } from './constants'
import { isLocalDevHost } from './is-local-dev-host'
import { getMatrixSharedSecret } from './matrix-secret'

type FleetGatewayEnv = {
  ENVIRONMENT?: string
  devscrolls_scrollsmatrix_crypto_matrix_shared_secret?: { get(): Promise<string> }
}

/**
 * UI/HTTP fleet apps: in production require X-Devscrolls-Gateway from scrollsmatrix proxy.
 * Skips /health and localhost (wrangler dev).
 */
export async function requireFleetGateway(
  request: Request,
  env: FleetGatewayEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (isLocalDevHost(url.hostname)) {
    return null
  }
  if (url.pathname === '/health') {
    return null
  }

  const expected = await getMatrixSharedSecret(
    env.devscrolls_scrollsmatrix_crypto_matrix_shared_secret,
  )
  if (!expected) {
    return null
  }

  const got = request.headers.get(FLEET_GATEWAY_HEADER)?.trim() ?? ''
  if (got !== expected) {
    return new Response(
      JSON.stringify({ ok: false, error: 'fleet_gateway_required' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }
  return null
}
