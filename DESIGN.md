# Devscrolls UI foundation (scaffold)

**Audience:** coding agents and humans shipping apps from this scaffold.  
**Status:** canonical house style for the Devscrolls fleet unless a product owner explicitly opts out in writing.

## Intent

Ship **predictable, on-brand UI** so builders focus on behavior and data, not one-off palettes or arbitrary Tailwind color picks. Implement with **DaisyUI components + semantic tokens** wired by the **`devscrolls`** theme in `src/styles/app.css`. **Stay close to DaisyUI and Tailwind defaults**—reuse component APIs and layout utilities; add custom CSS only when necessary, scoped, and documented.

## Brand personality (Devscrolls)

Voice the product through layout and motion, not through random color picks. Default reading:

| Pillar | What it means in UI |
|--------|---------------------|
| **Creativity** | Clever composition, clear hierarchy, and purposeful **accent** use—not novelty palettes or one-off CSS hacks outside tokens. |
| **Potential** | Interfaces feel **open and extensible**: breathable spacing, obvious next actions, progressive disclosure instead of clutter. |
| **Speed** | **Fast perceived performance**: lean DOM, no decorative bloat, prefer transforms for motion (`patterns/goldpath/gsap-prefer-transforms.md`), respect `prefers-reduced-motion`. |
| **Performance** | Ship **efficient CSS** (semantic utilities, one theme), avoid layout-thrashing animation, lazy non-critical work where the stack allows it. |
| **Efficiency** | **Primary** draws the eye to the main job; **base-*** carries structure; copy and components stay minimal—every pixel earns its place. |

Agents with **brand / marketing / UX-UI** skills own **execution inside these rails** (story, emphasis, flow, microcopy tone). They do **not** invent a parallel brand system per app.

## Where fleet rules change (scaffold first)

This **`scrolls-cf/scaffold`** repo is the **source of truth** for fleet-wide look: **`DESIGN.md`**, **`src/styles/app.css`**, and shared **`.cursor/rules`** that point here.

1. **Edit scaffold** (tokens, non-negotiables, new global patterns), **`npm run build:css`** when `src/styles/app.css` changes, commit, **`git push origin master`**.
2. **Merge into each repo that was forked from scaffold** (for example `jobs`, `repo-factory`, `looks1999`) on a schedule you choose; resolve conflicts by keeping **product-specific** surfaces in that repo and **fleet tokens + docs** from scaffold. **`scrollsmatrix`** is **not** forked from scaffold (separate gateway product); keep it fleet-aligned by **copying** files per [`patterns/goldpath/scrollsmatrix-fleet-design-sync.md`](./patterns/goldpath/scrollsmatrix-fleet-design-sync.md), not `git merge`.
3. Optional: use external skills (e.g. **[design-md](https://officialskills.sh/google-labs-code/skills/design-md)**, **[frontend-design](https://officialskills.sh/anthropics/skills/frontend-design)**) as **technique**—output must still map onto **`devscrolls`** semantics unless the product owner opts out in writing.

## Non-negotiables (agents)

1. **Theme:** root layout uses **`data-theme="devscrolls"`** on `<html>` (or the outer app shell). Do not add casual theme switchers unless the product spec requires it.
2. **Colors:** use **DaisyUI semantic colors** only (`primary`, `accent`, `base-*`, `neutral`, `info`, `success`, `warning`, `error`, and matching `*-content`). Do **not** use raw Tailwind palette classes for text or surfaces (`text-gray-*`, `bg-slate-*`, `text-blue-500`, etc.) except for **true** one-off debug or third-party embeds—and then isolate them.
3. **Surfaces:** most of the page is **`base-100` / `base-200` / `base-300`**; use **`primary`** for the main CTA and key focus; use **`accent`** for secondary highlights, tags, or “interesting” affordances. Use **`neutral`** for dense tool chrome, not for marketing hero fills.
4. **Typography:** **system UI stack** only unless a future revision of this file adds a webfont. Default body: `antialiased` on the shell; prefer **`text-base-content`** with opacity modifiers (`/70`, `/80`) over inventing new gray hex values.
5. **Density:** default to **comfortable** spacing (`gap-4`–`gap-8` in page sections, `p-4`–`p-6` on cards). Avoid ultra-tight `gap-1` layouts for primary flows.
6. **Radius:** theme sets rounded selectors and boxes; do not fight it with ad-hoc `rounded-sm` on Daisy components unless fixing a clash—prefer component defaults.
7. **Motion:** follow `docs/gsap-for-agents.md` and `patterns/goldpath/gsap-prefer-transforms.md`. No layout-thrashing animations on `width`/`height`/`top`/`left`.
8. **Content:** use **`prose prose-invert`** only where long-form markdown lives; keep app chrome outside `prose`.
9. **Tool surfaces (microcopy):** internal Workers, dashboards, and **repo-factory-style** flows default to **literal, efficient labels** (`name`, `description`, `submit`)—**not** conversational onboarding, long “first slice” disclaimers, or hint paragraphs under fields. **Field labels and control chrome** (not page/section titles) stay **lowercase** unless a proper noun or acronym requires otherwise. Ship **only** what the task needs; add prose when the **product spec** asks for marketing or education. **Accessibility** still requires real `<label>` / `aria-*` / errors—not filler copy.
10. **DaisyUI + Tailwind alignment (priority order — do not invert):**
    1. **Stock DaisyUI v5** components and documented markup (`btn`, `card`, `input`, `textarea`, `alert`, …).
    2. **Tailwind utilities** for layout and spacing (`flex`, `grid`, `gap-*`, responsive prefixes).
    3. **`devscrolls` tokens** in `src/styles/app.css` (OKLCH semantic roles) for brand—**not** per-page re-skins of every control.
    4. **Minimal scoped CSS** in `@layer components` only when **1–3** cannot satisfy the UX (document **why** in `DESIGN.md` or `patterns/goldpath/`).  
    Read [`patterns/goldpath/daisyui-tailwind-minimal-drift.md`](patterns/goldpath/daisyui-tailwind-minimal-drift.md) and [`patterns/goldpath/daisyui-5-form-fields-markup.md`](patterns/goldpath/daisyui-5-form-fields-markup.md); form foot-guns in [`patterns/errors/daisyui-5-legacy-form-class-names.md`](patterns/errors/daisyui-5-legacy-form-class-names.md) and [`patterns/errors/daisyui-5-textarea-wrapper-ux.md`](patterns/errors/daisyui-5-textarea-wrapper-ux.md).
11. **No unsolicited blocking overlays or browser dialogs:** do **not** add **modal dialogs** (DaisyUI `modal`, full-screen interstitials used as “are you sure?”, or equivalent) or **blocking confirmation UX** via **`window.alert`**, **`window.confirm`**, or **`window.prompt`** unless the **product owner explicitly requested** that pattern in the task or spec. Prefer **inline** feedback (`alert alert-*` banners, form errors, toasts if the stack already uses them, undo on primary surfaces) so flows stay fast and on-brand. (DaisyUI **`alert`** = in-page banner; it is **not** the same as `window.alert`.)

## Brand tokens (reference)

| Role | Hex (reference) | Semantic token |
|------|-----------------|----------------|
| Brand gradient A (cyan) | `#7dd3fc` | maps to **`primary`** family |
| Brand gradient B (violet) | `#a78bfa` | maps to **`accent`** family |
| Canvas (dark) | derived from dim-like cool neutrals | **`base-100` … `base-content`** |

Exact OKLCH values live in **`src/styles/app.css`** (`@plugin "daisyui/theme"` → `devscrolls`). **That file is the runtime source of truth**; update this table’s hex column when marketing needs a swatch card, but change tokens in CSS first.

## Typography scale (logical)

- **Display / hero:** `text-4xl`–`text-6xl`, `font-semibold` or `font-bold`, `tracking-tight`, `text-base-content`.
- **Page title:** `text-2xl`–`text-3xl`, `font-semibold`.
- **Section heading:** `text-xl`–`text-2xl`, `font-semibold`.
- **Body:** default (`text-base`), `text-base-content/90`, relaxed leading where paragraphs exist.
- **Meta / captions:** `text-sm`, `text-base-content/60`.

## Components (defaults)

- **Primary action:** `btn btn-primary`.
- **Secondary action:** `btn btn-outline` or `btn btn-ghost` on `base-100`/`base-200`.
- **Destructive:** `btn btn-error` (never `btn-primary` for delete).
- **Surfaces:** `card bg-base-200` or `bg-base-100` with `border border-base-300` when separation helps.
- **Alerts / feedback:** `alert alert-info | warning | error` for strong block feedback; **`success`** stays a semantic token. For **inline success beside primary links** (e.g. repo-factory / scrollsmatrix gateway), use scoped **`#alert-success`** in `src/styles/app.css` instead of **`alert alert-success`** so **`primary`** links stay legible on a **base-** tinted surface.
- **Gateway repo form:** Apps that embed **`#matrix-gateway-repo-form`** (and the field ids from `patterns/goldpath/daisyui-5-form-fields-markup.md`) inherit scoped field width, validation border/outline, and label error tint from the same CSS file.

## looks2000 site fetch (this product)

Same card UX as **looks1999** (scrollsmatrix gateway shell). Phase 1 identical; phase 2 uses **Browser Rendering content API** (same backend as [Cloudflare browser MCP](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/browser-rendering)) — see **`docs/BROWSER-RENDERING-MCP.md`**, **`docs/COMPARE-LOOKS1999.md`**.

- **`POST /api/analyze`** → `handoff` + `summary`; `crawl.browser` blocked when daily/monthly rendering budget is exhausted.
- **`POST /api/content`** → same `handoff.pages[]` shape as looks1999; KV tracks `X-Browser-Ms-Used`.
- **`GET /api/browser-budget`** — remaining ms for current plan (`free` 10 min/day UTC, `paid` 10 h/month UTC).

## When to copy an external `DESIGN.md`

Only when the **product owner** asks for a **different** aesthetic (another brand, white-label, or strict client guide). Then follow `docs/design-md-for-agents.md` and merge conflicts **explicitly**—do not silently fork the fleet palette.

## Revision

Tweaks to the fleet look belong here and in `src/styles/app.css` together; bump a short note at the bottom when you change tokens.

_Changelog: 2026-05-16 — **Where fleet rules change** #2: **scrollsmatrix** is not a scaffold Git fork; manual sync goldpath linked. 2026-05-15 — Non-negotiable **#11** (no modals / browser `confirm` unless requested; DaisyUI `alert` banners unchanged); **#9** lowercase tool labels; **Components** gateway **`#alert-success`** + **`#matrix-gateway-repo-form`**. 2026-05-14 — `patterns/errors/README.md`: sad-path ↔ gold-path tables (design + GSAP); cross-links in `daisyui.md`, `daisyui-tailwind-v4-config.md`, `design-md-for-agents.md`, `patterns/README.md`. 2026-05-14 — Non-negotiable **#10** expanded: ordered stack (Daisy → Tailwind → tokens → scoped CSS); form goldpath + textarea UX errors linked. 2026-05-14 — Initial Devscrolls foundation. 2026-05-14 — Brand personality pillars; scaffold-first fleet evolution; brand/UX agent ownership inside rails. 2026-05-14 — Agent guide + patterns index: scrollsmatrix manual-sync pointer. 2026-05-14 — Non-negotiable #9: terse tool microcopy. 2026-05-14 — Non-negotiable #10 + goldpath: minimal drift from DaisyUI + Tailwind (reuse components/utilities; scoped overrides only)._
