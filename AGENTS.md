# Agent map (looks2000)

**Role:** fleet site-analyze Worker — same phase-1 static crawl as **looks1999**; phase 2 uses **Cloudflare Browser Rendering** (MCP-equivalent REST API), not Puppeteer.

## Start here

| Task | Read first |
|------|------------|
| Compare with looks1999 | [`docs/COMPARE-LOOKS1999.md`](./docs/COMPARE-LOOKS1999.md) |
| Browser Rendering + KV budget | [`docs/BROWSER-RENDERING-MCP.md`](./docs/BROWSER-RENDERING-MCP.md) |
| Deploy / Builds | [`docs/CLOUDFLARE-WORKERS-BUILDS.md`](./docs/CLOUDFLARE-WORKERS-BUILDS.md) |
| Fleet UI rules | [`DESIGN.md`](./DESIGN.md) |

## Verify (non-blocking)

Do **not** use `npm run dev` for a quick health check — it holds a terminal. Use agent scripts:

| Goal | Command |
|------|---------|
| CSS build | `npm run agent:verify:build` |
| Build + short `wrangler dev` + `/health` | `npm run agent:verify:dev` |
| Both | `npm run agent:verify` |

Local secrets: copy `.env.example` → `.env` (matrix secret + operator Cloudflare API token with **Browser Rendering write**).

## Fleet access

Production UI: **scrollsmatrix** → `/apps/looks2000/`. Worker has **`workers_dev: false`** — no public `*.workers.dev`.
