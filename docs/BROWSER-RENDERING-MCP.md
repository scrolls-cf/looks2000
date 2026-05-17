# Browser Rendering (MCP + looks2000 phase 2)

**looks2000** phase 2 calls the same **Cloudflare Browser Rendering REST API** that powers the hosted MCP server — not the MCP wire protocol from inside the Worker.

## Hosted MCP (for Cursor / external agents)

| Item | Value |
|------|--------|
| Remote URL | `https://browser.mcp.cloudflare.com/mcp` |
| Tools | `get_url_html_content`, `get_url_markdown`, `get_url_screenshot` |
| Auth | Cloudflare OAuth + `browser:write` |
| Source | [mcp-server-cloudflare/apps/browser-rendering](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/browser-rendering) |

Configure in Cursor via `mcp-remote` (see upstream README).

## looks2000 Worker (fleet compare)

| Phase | Engine |
|-------|--------|
| 1 | Static `fetch` — same as **looks1999** |
| 2 | `POST /accounts/{id}/browser-rendering/content` (quick action) per route |

Token: Secrets Store **`devscrolls_repo_factory_operator_cloudflare_api_token`** or local **`CLOUDFLARE_API_TOKEN`** (needs Browser Rendering write).

## Billing / budget lock

[Pricing](https://developers.cloudflare.com/browser-rendering/pricing/): **Free** ~10 min browser hours/day; **Paid** 10 h/month then $0.09/h.

looks2000 tracks **`X-Browser-Ms-Used`** in KV **`BROWSER_USAGE`** and sets `crawl.browser` to **`blocked`** when over budget. Set **`BROWSER_RENDERING_PLAN`**: `free` | `paid`, **`BROWSER_RENDERING_ENABLED`**: `true` | `false`.

Check: `GET /health`, `GET /api/browser-budget`.

## KV setup (deploy)

**`BROWSER_USAGE`** is bound in `wrangler.jsonc` (production + preview ids). To recreate on a new account:

```bash
npx wrangler kv namespace create BROWSER_USAGE
npx wrangler kv namespace create BROWSER_USAGE --preview
```

Then paste `id` / `preview_id` into `kv_namespaces`.

## Compare with looks1999

See **[COMPARE-LOOKS1999.md](./COMPARE-LOOKS1999.md)**.
