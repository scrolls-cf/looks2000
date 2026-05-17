export function isLocalDevHost(hostname: string | null | undefined): boolean {
  const h = String(hostname ?? '').toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}
