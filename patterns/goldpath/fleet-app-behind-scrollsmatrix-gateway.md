---
kind: goldpath
topics: [scrollsmatrix, workers, service-bindings, fleet, scaffold, security]
date: "2026-05-16"
---

# Fleet app behind scrollsmatrix gateway

- **Date:** 2026-05-16
- **Source:** [FLEET-ARCHITECTURE.md](../../../FLEET-ARCHITECTURE.md); [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- **Topic:** scaffold forks that ship UI + HTTP (not RPC-only like repo-factory)

## Summary

1. **`workers_dev: false`** in `wrangler.jsonc` — no public `*.workers.dev`.
2. Bind **`devscrolls_scrollsmatrix_crypto_matrix_shared_secret`** (Secrets Store).
3. **`app.use('*', requireFleetGateway)`** from `src/lib/fleet-gateway/` — requires `X-Devscrolls-Gateway` off localhost when the secret is configured.
4. **Browser assets:** use relative paths (`assets/app.css`, `api/analyze` via `fleetApiPath` in `public/assets/fleet-api.js` or inline helper).
5. **scrollsmatrix** wires `[[services]]`, `/apps/{slug}/*` proxy, and a registry row — manual until provision automation ships.

## RPC-only exception

**repo-factory** uses RPC + `/api/gateway/*` on scrollsmatrix; block intake HTTP off loopback (`block-prod-intake-http.ts`).

## Related

- [`../errors/fleet-public-workers-dev-gateway-only.md`](../errors/fleet-public-workers-dev-gateway-only.md)
- [`../../../scrollsmatrix/patterns/goldpath/scrollsmatrix-ecosystem-service-bindings.md`](../../../scrollsmatrix/patterns/goldpath/scrollsmatrix-ecosystem-service-bindings.md) (copy path after scrollsmatrix sync)
