/** Browser Run quick-actions limits — https://developers.cloudflare.com/browser-rendering/pricing/ */
export const BROWSER_MS_FREE_PER_DAY = 600_000 // 10 minutes
export const BROWSER_MS_PAID_PER_MONTH = 36_000_000 // 10 hours

export type BrowserRenderingPlan = 'free' | 'paid'

export function parseBrowserRenderingPlan(raw: string | undefined): BrowserRenderingPlan {
  return raw === 'paid' ? 'paid' : 'free'
}

export function isBrowserRenderingEnabled(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return true
  return raw === 'true' || raw === '1'
}

export function budgetLimitMs(plan: BrowserRenderingPlan): number {
  return plan === 'paid' ? BROWSER_MS_PAID_PER_MONTH : BROWSER_MS_FREE_PER_DAY
}

export function budgetPeriodKey(plan: BrowserRenderingPlan, now = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return plan === 'paid' ? `${y}-${m}` : `${y}-${m}-${d}`
}
