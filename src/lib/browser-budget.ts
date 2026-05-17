import {
  budgetLimitMs,
  budgetPeriodKey,
  isBrowserRenderingEnabled,
  parseBrowserRenderingPlan,
  type BrowserRenderingPlan,
} from './browser-rendering-config'

export type BrowserBudgetStatus = {
  enabled: boolean
  plan: BrowserRenderingPlan
  period: string
  limit_ms: number
  used_ms: number
  remaining_ms: number
  available: boolean
  /** `none` when BROWSER_USAGE KV is not bound — usage is not tracked (dev only). */
  tracking: 'kv' | 'none'
  reason?: string
}

const KV_KEY_PREFIX = 'browser_ms:'

function kvKey(plan: BrowserRenderingPlan, period: string): string {
  return `${KV_KEY_PREFIX}${plan}:${period}`
}

export async function readBrowserBudgetStatus(env: {
  BROWSER_RENDERING_ENABLED?: string
  BROWSER_RENDERING_PLAN?: string
  BROWSER_USAGE?: KVNamespace
}): Promise<BrowserBudgetStatus> {
  const enabled = isBrowserRenderingEnabled(env.BROWSER_RENDERING_ENABLED)
  const plan = parseBrowserRenderingPlan(env.BROWSER_RENDERING_PLAN)
  const period = budgetPeriodKey(plan)
  const limit_ms = budgetLimitMs(plan)

  const tracking = env.BROWSER_USAGE ? 'kv' : 'none'

  if (!enabled) {
    return {
      enabled: false,
      plan,
      period,
      limit_ms,
      used_ms: 0,
      remaining_ms: 0,
      available: false,
      tracking,
      reason: 'Browser Rendering phase 2 is disabled on this Worker.',
    }
  }

  const used_ms = await readUsedMs(env.BROWSER_USAGE, plan, period)
  const remaining_ms = Math.max(0, limit_ms - used_ms)
  const available = tracking === 'none' ? true : remaining_ms > 0

  return {
    enabled: true,
    plan,
    period,
    limit_ms,
    used_ms,
    remaining_ms: tracking === 'none' ? limit_ms : remaining_ms,
    available,
    tracking,
    reason: available
      ? tracking === 'none'
        ? 'KV not configured — budget not enforced (set BROWSER_USAGE for production).'
        : undefined
      : plan === 'free'
        ? 'Free plan daily Browser Rendering budget exhausted (~10 min/day).'
        : 'Paid plan monthly Browser Rendering budget exhausted (10 h/month included).',
  }
}

async function readUsedMs(
  kv: KVNamespace | undefined,
  plan: BrowserRenderingPlan,
  period: string,
): Promise<number> {
  if (!kv) return 0
  const raw = await kv.get(kvKey(plan, period))
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export async function recordBrowserMsUsed(
  kv: KVNamespace | undefined,
  plan: BrowserRenderingPlan,
  period: string,
  deltaMs: number,
): Promise<number> {
  if (!kv || deltaMs <= 0) return 0
  const key = kvKey(plan, period)
  const prev = await readUsedMs(kv, plan, period)
  const next = prev + Math.round(deltaMs)
  const ttl = plan === 'paid' ? 60 * 60 * 24 * 45 : 60 * 60 * 24 * 2
  await kv.put(key, String(next), { expirationTtl: ttl })
  return next
}
