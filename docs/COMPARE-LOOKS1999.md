# looks1999 vs looks2000

Same UI and **`handoff`** JSON shape. Different phase-2 engine.

| | **looks1999** | **looks2000** |
|---|---------------|---------------|
| Phase 1 | Static crawl | Same code path |
| Phase 2 | `@cloudflare/puppeteer` + `BROWSER` binding | Browser Rendering **content** API (MCP-equivalent) |
| Billing | Browser **sessions** (hours + concurrent browsers) | Quick actions (browser hours only) |
| Budget gate | None in app | KV + daily/monthly caps |
| Debug `content.method` | `browser` | `browser` (+ optional `content.rendering`) |

## Try both on one site

1. Deploy or `wrangler dev` each Worker.
2. POST `{ "site": "https://example.com" }` to `/api/analyze` on both.
3. POST `{ "summary": … }` to `/api/content` on both (when `crawl.browser === available`).
4. Diff `handoff.pages` (paths, `h1`, `body`, `ctas`).

Wix/JS-heavy sites: expect the largest deltas.
