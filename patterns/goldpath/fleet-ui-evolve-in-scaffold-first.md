---
kind: goldpath
topics: [branding, ui, fleet, scaffold, design-system]
date: "2026-05-14"
---

# Fleet UI: evolve in scaffold first (gold path)

- **Date** — 2026-05-14
- **Source** — repo-root [`DESIGN.md`](../../DESIGN.md); [`.cursor/rules/follow-devscrolls-ui-foundation.mdc`](../../.cursor/rules/follow-devscrolls-ui-foundation.mdc)
- **Topic** — where token, theme, and fleet-wide UX rules change

## Snippet or summary

1. **Canonical repo:** **`scrolls-cf/scrollsdesigner`** — see **[`fleet-design-evolve-in-scrollsdesigner-first.md`](./fleet-design-evolve-in-scrollsdesigner-first.md)**.
2. **Legacy workflow (apps only):** after scrollsdesigner sync, commit in this repo. Product markup stays here; fleet tokens come from scrollsdesigner. **`scrollsmatrix`:** still manual if not in sync script — **[`scrollsmatrix-fleet-design-sync.md`](./scrollsmatrix-fleet-design-sync.md)**.
3. **Do not** introduce a divergent palette or parallel `DESIGN.md` “v2” in a fork without either merging the same change back into scaffold or getting an explicit product opt-out (see `docs/design-md-for-agents.md`).

## When to use

Any time you would change **OKLCH theme values**, **semantic color roles**, **fleet-wide motion rules**, or **global typography defaults** that more than one app should inherit.
