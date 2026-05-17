export function isProductionEnv(env: { ENVIRONMENT?: string }): boolean {
  return String(env.ENVIRONMENT ?? '').trim().toLowerCase() === 'production'
}
