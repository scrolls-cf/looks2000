/* eslint-disable */
// Generated-style bindings for looks2000 — run `npm run cf-typegen` after wrangler.jsonc changes.

interface CloudflareBindings {
  ASSETS: Fetcher
  CLOUDFLARE_ACCOUNT_ID: string
  ENVIRONMENT: string
  SCROLLSMATRIX_PUBLIC_URL: string
  SECRETS_STORE_ID: string
  BROWSER_RENDERING_PLAN: string
  BROWSER_RENDERING_ENABLED: string
  BROWSER_USAGE: KVNamespace
  devscrolls_scrollsmatrix_crypto_matrix_shared_secret?: SecretsStoreSecret
  devscrolls_repo_factory_operator_cloudflare_api_token?: SecretsStoreSecret
}

interface SecretsStoreSecret {
  get(): Promise<string>
}
