# Patterns (agent-oriented)

This directory holds **short, durable notes for AI coding agents** working in this repo: what to **follow** (`goldpath/`) and what to **avoid** (`errors/`). Humans maintain it; agents should **read it before inventing** stack-specific setup or repeating fixed bugs.

**Rule:** when you fix a non-trivial error or CI failure, you **must** record it under **`patterns/errors/`** (what went wrong) and **`patterns/goldpath/`** (what to do instead) — see [`.cursor/rules/document-fixes-in-patterns.mdc`](../.cursor/rules/document-fixes-in-patterns.mdc).

## Navigate in three steps

1. **Skim `errors/`** for pitfalls that match your task (Tailwind, DaisyUI, Hono, Workers, etc.).
2. **Open `goldpath/`** for vetted snippets and constraints tied to this codebase.
3. **Prefer upstream `docs/`** for full references; use `patterns/` for **decisions already made here**.

## Design, UI, and Devscrolls branding

**Routine UI (default):** read repo-root **[`../DESIGN.md`](../DESIGN.md)** and follow **[`.cursor/rules/follow-devscrolls-ui-foundation.mdc`](../.cursor/rules/follow-devscrolls-ui-foundation.mdc)** — `data-theme="devscrolls"`, DaisyUI semantics, no ad-hoc Tailwind grays for chrome. **Fleet-wide visual changes** ship from scaffold first: **[`goldpath/fleet-ui-evolve-in-scaffold-first.md`](./goldpath/fleet-ui-evolve-in-scaffold-first.md)**.

**DaisyUI + Tailwind (minimal drift):** **[`goldpath/daisyui-tailwind-minimal-drift.md`](./goldpath/daisyui-tailwind-minimal-drift.md)** — reuse stock components/utilities; scoped overrides only.

**DaisyUI 5 forms:** **[`goldpath/daisyui-5-form-fields-markup.md`](./goldpath/daisyui-5-form-fields-markup.md)**; sad path / avoid **[`errors/daisyui-5-legacy-form-class-names.md`](./errors/daisyui-5-legacy-form-class-names.md)** and **[`errors/daisyui-5-textarea-wrapper-ux.md`](./errors/daisyui-5-textarea-wrapper-ux.md)** (indexed in **[`errors/README.md`](./errors/README.md)**).

**Browser multi-step UI (`fetch`):** **[`goldpath/browser-async-chaining-multi-step-ui.md`](./goldpath/browser-async-chaining-multi-step-ui.md)**; avoid **[`errors/browser-single-fetch-fake-progress.md`](./errors/browser-single-fetch-fake-progress.md)**.

**looks2000 phase 2 (Browser Rendering API / MCP backend):** **[`goldpath/browser-rendering-quick-actions-phase2.md`](./goldpath/browser-rendering-quick-actions-phase2.md)**; avoid **[`errors/browser-rendering-budget-exhausted.md`](./errors/browser-rendering-budget-exhausted.md)** — see **[`../docs/BROWSER-RENDERING-MCP.md`](../docs/BROWSER-RENDERING-MCP.md)**.

**Scrollsmatrix (standalone repo, no `git merge`):** **[`goldpath/scrollsmatrix-fleet-design-sync.md`](./goldpath/scrollsmatrix-fleet-design-sync.md)**.

**GitHub (new fleet repos):** default **public**; **scrollsmatrix** is the **private** exception — **[`goldpath/github-fleet-repo-visibility-default.md`](./goldpath/github-fleet-repo-visibility-default.md)**.

**Build / deploy (fleet):** GitHub for **version control** only; **Cloudflare Workers Builds** watches the repo — **[`goldpath/github-vcs-cloudflare-builds.md`](./goldpath/github-vcs-cloudflare-builds.md)**.

**Non-fleet or external Stitch-style `DESIGN.md`:** read **[`../docs/design-md-for-agents.md`](../docs/design-md-for-agents.md)** and **[`goldpath/design-md-brand-ui.md`](./goldpath/design-md-brand-ui.md)**. Agent rule: [`.cursor/rules/consult-design-md-for-branding.mdc`](../.cursor/rules/consult-design-md-for-branding.mdc).

## Layout

| Path | Agent use |
| --- | --- |
| [`goldpath/`](./goldpath/README.md) | **Follow** — canonical setup, snippets, and “when to use” for this project (Hono on Workers, CSS build, bindings). |
| [`errors/`](./errors/README.md) | **Avoid** — anti-patterns, deprecated configs, and mistakes already corrected. |

## Naming files

- **Kebab-case** filenames only (e.g. `d1-migrations.md`, `tailwind-vite.md`).
- **Stable topic** — `stack-or-feature.md` for evergreen guidance.
- **Dated note** — `YYYY-MM-DD-short-slug.md` for one-off research or context that may age (still kebab-case after the date).

One main topic per file when possible so agents can open a single focused page.

## Optional YAML frontmatter

Pattern **entries** (not these READMEs) may start with machine-friendly metadata so agents can pick files by topic:

```yaml
---
kind: goldpath   # or anti-pattern
topics: [tailwind, vite]
date: "2026-05-13"
---
```

Use `kind: anti-pattern` in `errors/`. Keep `topics` as a small lowercase list (packages, APIs, or areas). `date` is ISO **string**.

## After you fix or standardize something

When you resolve a non-trivial bug or lock in a stack choice, add a concise entry to `errors/` and/or `goldpath/` and cite `docs/` or upstream links. See the README inside each subfolder for the bullet fields to include.
