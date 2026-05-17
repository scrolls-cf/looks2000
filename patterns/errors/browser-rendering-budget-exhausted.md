# Browser Rendering budget exhausted (looks2000)

topics: [cloudflare, browser-rendering, budget, looks2000]

## Symptom

- `POST /api/content` → **`browser_budget_exhausted`** (503)
- Phase 1 `handoff.crawl.browser` → **`blocked`** with `kind: note` blocker
- `GET /api/browser-budget` → `available: false`

## Why

KV-tracked browser ms exceeded plan limit (**free**: ~10 min/UTC day; **paid**: 10 h/UTC month).

## Fix

1. Wait for next period, or set **`BROWSER_RENDERING_PLAN=paid`** on Paid Workers.
2. Confirm KV **`BROWSER_USAGE`** binding and ids in `wrangler.jsonc`.
3. Temporarily disable phase 2: **`BROWSER_RENDERING_ENABLED=false`**.
4. Use **looks1999** if you need Puppeteer and have session quota.

## Gold path

[`../goldpath/browser-rendering-quick-actions-phase2.md`](../goldpath/browser-rendering-quick-actions-phase2.md)
