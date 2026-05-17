---
kind: anti-pattern
topics: [workers, scrollsmatrix, repo-factory, security, cloudflare-access, service-bindings]
date: "2026-05-15"
---

# Treating every fleet Worker as a public `*.workers.dev` app

- **Date:** 2026-05-15  
- **Context:** **scrollsmatrix** (gateway, Cloudflare Access) + **repo-factory** (GitHub PAT, fork RPC).  
- **Bad pattern** — Leaving **`workers_dev: true`** (default) on a Worker that holds high-privilege secrets, wiring **`REPO_FACTORY_PUBLIC_URL`** to that Worker’s **`*.workers.dev`** origin, and/or letting the gateway **`fetch`** that URL in production so intake can “work” without the service binding. **repo-factory** historically used open CORS on **`POST /api/intake`** / **`/api/fork`**; a guessable public URL meant any site could drive fork creation.  
- **Why it is wrong** — **Cloudflare Access** on **scrollsmatrix** does **not** protect other Workers’ hostnames. Each script is its own public route unless you disable **`workers.dev`**, add Access on that hostname, or keep HTTP off the public internet entirely.  
- **Fix / reference** — See **[`../../../FLEET-ARCHITECTURE.md`](../../../FLEET-ARCHITECTURE.md)** and [`../goldpath/fleet-app-behind-scrollsmatrix-gateway.md`](../goldpath/fleet-app-behind-scrollsmatrix-gateway.md).

Do not paste tokens, JWTs, or PATs into pattern files.
