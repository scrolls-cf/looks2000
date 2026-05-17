# looks2000 — Cloudflare Workers Builds

**looks2000** is a fleet site-analyze Worker (static crawl + Browser Rendering API for phase 2). Internal compare fork of **looks1999** — not a public gateway entry.

Wrangler **`name`**: **`looks2000`**. **`.nvmrc`** → Node **22**. Deploy: **`npm run build:css && wrangler deploy`**.

Before production phase 2: bind **`BROWSER_USAGE`** KV and operator API token — **`docs/BROWSER-RENDERING-MCP.md`**.

Registry: **[`../../scrollsmatrix/docs/fleet-workers-builds.md`](../../scrollsmatrix/docs/fleet-workers-builds.md)**.
