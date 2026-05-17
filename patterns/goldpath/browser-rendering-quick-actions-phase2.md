# Browser Rendering quick actions for phase 2 (looks2000)

topics: [cloudflare, browser-rendering, workers, looks2000]

## When

Fleet site ingest where **looks1999** Puppeteer is too costly or you want parity with [Cloudflare browser MCP](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/browser-rendering).

## Do

1. Phase 1 unchanged (static analyze → `summary` / `handoff`).
2. Phase 2: `POST …/browser-rendering/content` per route; reuse **`pageContentFromHtml`** + rebuild filters.
3. Record **`X-Browser-Ms-Used`** into KV; block when over [pricing](https://developers.cloudflare.com/browser-rendering/pricing/) budget.
4. API token with **Browser Rendering write** (fleet Secrets Store operator token).

## Avoid

- Calling **`browser.mcp.cloudflare.com`** from a Worker (OAuth + MCP framing — use REST instead).
- Skipping KV on production if you rely on the 10 min/day free cap.

## Related

- [`../../docs/BROWSER-RENDERING-MCP.md`](../../docs/BROWSER-RENDERING-MCP.md)
- [`../errors/browser-rendering-budget-exhausted.md`](../errors/browser-rendering-budget-exhausted.md)
