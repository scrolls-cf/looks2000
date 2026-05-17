# Fleet hosting note (looks2000)

**looks2000** is an internal site-analyze Worker (static crawl + Browser Rendering API for phase 2). Compare fork of **looks1999** — not a public fleet entry point.

**Fleet context:** For **`scrolls-cf`** on the primary devscrolls Cloudflare account, GitHub app install, Cloudflare ↔ GitHub OAuth (**Task C0**), and the user-scoped Builds API token (**`scrollsmatrix`** **`CLOUDFLARE_API_TOKEN_WORKERS_BUILDS`** / **`devscrolls_repo_factory_operator_cloudflare_api_token`**) are already in place. See **[`../../scrollsmatrix/docs/cf-runbook.md`](../../scrollsmatrix/docs/cf-runbook.md)** and **[`../../scrollsmatrix/.cursor/rules/deploy-cloudflare-worker-on-request.mdc`](../../scrollsmatrix/.cursor/rules/deploy-cloudflare-worker-on-request.mdc)**.

## Exposure

| Setting | Value |
| ------- | ----- |
| **`workers_dev`** | **`false`** — no public **`https://looks2000.<subdomain>.workers.dev`** |
| Team UI | Use **scrollsmatrix** (Cloudflare Access) or **`npm run dev`** locally |

After deploy, verify: **`curl -sS -o /dev/null -w "%{http_code}" "https://looks2000.jvalamis.workers.dev/health"`** → **404**.

## Trigger values (Workers Builds)

| Field | Value |
| ----- | ----- |
| Git repo | **`scrolls-cf/looks2000`** |
| Production branch | **`master`** |
| Build command | *(empty — deploy runs the full pipeline)* |
| Deploy command | **`npm ci && npm run deploy`** |

Wrangler **`name`**: **`looks2000`**. **`.nvmrc`** → Node **22**. **`npm run deploy`** runs **`build:css`** then **`wrangler deploy`**. Requires **`BROWSER_USAGE`** KV in `wrangler.jsonc` (see **`docs/BROWSER-RENDERING-MCP.md`**).

## Secrets Store (production)

| Wrangler `binding` | Secret `name` | Purpose |
| ------------------ | --------------- | ------- |
| **`devscrolls_scrollsmatrix_crypto_matrix_shared_secret`** | same | Fleet gateway header validation |
| **`devscrolls_repo_factory_operator_cloudflare_api_token`** | same | Browser Rendering REST API (phase 2) |

## Registry row

Canonical table: **[`../../scrollsmatrix/docs/fleet-workers-builds.md`](../../scrollsmatrix/docs/fleet-workers-builds.md)**.

**Auto-deploy:** Production trigger on **`master`**; pushes to **`scrolls-cf/looks2000`** run **`npm ci && npm run deploy`**. If builds fail immediately with a rolled build token, **PATCH** the trigger’s **`build_token_uuid`** to the current **`devscrolls-repo-factory-builds`** row from **GET** `…/builds/tokens` (see [`../../scrollsmatrix/patterns/errors/workers-builds-build-token-deleted-or-rolled.md`](../../scrollsmatrix/patterns/errors/workers-builds-build-token-deleted-or-rolled.md)).

## References

- [`./BROWSER-RENDERING-MCP.md`](./BROWSER-RENDERING-MCP.md)
- [`./COMPARE-LOOKS1999.md`](./COMPARE-LOOKS1999.md)
- [`../../scrollsmatrix/patterns/errors/fleet-public-workers-dev-gateway-only.md`](../../scrollsmatrix/patterns/errors/fleet-public-workers-dev-gateway-only.md)
