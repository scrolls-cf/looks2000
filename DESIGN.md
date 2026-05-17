> **Synced from scrollsdesigner.** Canonical edits: `scrolls-cf/scrollsdesigner` → `npm run sync:fleet`. Product CSS: `src/styles/product.css` in this repo.

# Devscrolls UI foundation (looks2000)

**Audience:** coding agents and humans shipping any Devscrolls fleet app.  
**Status:** canonical house style unless a product owner explicitly opts out in writing.

## Intent

Ship **predictable, on-brand UI** so builders focus on behavior and data, not one-off palettes or arbitrary Tailwind color picks. Implement with **DaisyUI components + semantic tokens** from **`themes/`** (built via `src/styles/app.css`). **Stay close to DaisyUI and Tailwind defaults**—reuse component APIs and layout utilities; add custom CSS only when necessary, scoped, and documented.

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

## Where fleet rules change (scrollsdesigner first)

This **`scrolls-cf/scrollsdesigner`** repo is the **source of truth** for fleet-wide look: **`DESIGN.md`**, **`themes/`**, **`src/styles/`**, **`src/animations/`**, **`components/`**.

1. **Edit scrollsdesigner** (tokens, themes, non-negotiables, global patterns), **`npm run build:css`**, commit, push.
2. **Sync** built CSS and docs into **`scaffold`** and apps per [`docs/sync-to-fleet.md`](./docs/sync-to-fleet.md) and [`patterns/goldpath/fleet-design-evolve-in-scrollsdesigner-first.md`](./patterns/goldpath/fleet-design-evolve-in-scrollsdesigner-first.md). **`scrollsmatrix`** is not a scaffold fork—copy per [`patterns/goldpath/scrollsmatrix-fleet-design-sync.md`](./patterns/goldpath/scrollsmatrix-fleet-design-sync.md).
3. Optional external skills (**[design-md](https://officialskills.sh/google-labs-code/skills/design-md)**, **[frontend-design](https://officialskills.sh/anthropics/skills/frontend-design)**) are **technique only**—output must map onto fleet theme semantics unless the product owner opts out in writing.

## Palette (one fleet theme)

| Theme | Role |
|-------|------|
| **`devscrolls`** | Single dark palette from brand mark (#242933 canvas, cyan primary, violet accent) |

Set **`data-theme="devscrolls"`** on `<html>`. **Stock DaisyUI** components; scrollsdesigner supplies **semantic colors + splash** only. App-specific CSS: **`src/styles/product.css`**. Details: [`themes/README.md`](./themes/README.md).

## Non-negotiables (agents)

1. **Theme:** root layout uses **`data-theme="devscrolls"`** on `<html>`. Do not add theme switchers unless the product spec requires it.
2. **Colors:** use **DaisyUI semantic colors** only (`primary`, `accent`, `base-*`, `neutral`, `info`, `success`, `warning`, `error`, and matching `*-content`). Do **not** use raw Tailwind palette classes for text or surfaces (`text-gray-*`, `bg-slate-*`, `text-blue-500`, etc.) except for **true** one-off debug or third-party embeds—and then isolate them.
3. **Surfaces:** most of the page is **`base-100` / `base-200` / `base-300`**; use **`primary`** for the main CTA and key focus; use **`accent`** for secondary highlights, tags, or “interesting” affordances. Use **`neutral`** for dense tool chrome, not for marketing hero fills.
4. **Typography:** **system UI stack** only unless a future revision of this file adds a webfont. Default body: `antialiased` on the shell; prefer **`text-base-content`** with opacity modifiers (`/70`, `/80`) over inventing new gray hex values.
5. **Density:** default to **comfortable** spacing (`gap-4`–`gap-8` in page sections, `p-4`–`p-6` on cards). Avoid ultra-tight `gap-1` layouts for primary flows.
6. **Radius:** theme sets rounded selectors and boxes; do not fight it with ad-hoc `rounded-sm` on Daisy components unless fixing a clash—prefer component defaults.
7. **Motion:** use presets in **`src/animations/`** when possible; otherwise follow `docs/gsap-for-agents.md` and `patterns/goldpath/gsap-prefer-transforms.md`. No layout-thrashing animations on `width`/`height`/`top`/`left`.
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
| Brand gradient A (cyan) | `#89d3df` | **`primary`** |
| Brand mid (blue) | `#68a0cf` | **`secondary`** |
| Brand gradient B (violet) | `#9d8df1` | **`accent`** |
| Canvas (dark) | `#242933` | **`base-100` … `base-content`** |

Exact OKLCH values live in **`themes/*.css`**. **Those files are the runtime source of truth**; update this table’s hex column when marketing needs a swatch card, but change tokens in `themes/` first.

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
- **Alerts / feedback:** default **`alert alert-*`** from DaisyUI. Gateway/repo-factory success strips live in each app’s **`product.css`** (`#alert-success`), not fleet `components.css`.
- **Gateway repo form:** validation/width overrides belong in the app’s **`product.css`** when it embeds **`#matrix-gateway-repo-form`**.

## When to copy an external `DESIGN.md`

Only when the **product owner** asks for a **different** aesthetic (another brand, white-label, or strict client guide). Then follow `docs/design-md-for-agents.md` and merge conflicts **explicitly**—do not silently fork the fleet palette.

## Revision

Tweaks to the fleet look belong here and in `src/styles/app.css` together; bump a short note at the bottom when you change tokens.

_Changelog: 2026-05-17 — Single **`devscrolls`** palette (screenshot brand); removed multi-theme set; fleet **`components.css`** = splash only; form/gateway overrides → app **`product.css`**. 2026-05-16 — **scrollsdesigner** owns fleet design (themes/, animations/, components/); four fleet themes; sync via `docs/sync-to-fleet.md`. 2026-05-16 — **Where fleet rules change** #2: **scrollsmatrix** is not a scaffold Git fork; manual sync goldpath linked. 2026-05-15 — Non-negotiable **#11** (no modals / browser `confirm` unless requested; DaisyUI `alert` banners unchanged); **#9** lowercase tool labels; **Components** gateway **`#alert-success`** + **`#matrix-gateway-repo-form`**. 2026-05-14 — `patterns/errors/README.md`: sad-path ↔ gold-path tables (design + GSAP); cross-links in `daisyui.md`, `daisyui-tailwind-v4-config.md`, `design-md-for-agents.md`, `patterns/README.md`. 2026-05-14 — Non-negotiable **#10** expanded: ordered stack (Daisy → Tailwind → tokens → scoped CSS); form goldpath + textarea UX errors linked. 2026-05-14 — Initial Devscrolls foundation. 2026-05-14 — Brand personality pillars; scaffold-first fleet evolution; brand/UX agent ownership inside rails. 2026-05-14 — Agent guide + patterns index: scrollsmatrix manual-sync pointer. 2026-05-14 — Non-negotiable #9: terse tool microcopy. 2026-05-14 — Non-negotiable #10 + goldpath: minimal drift from DaisyUI + Tailwind (reuse components/utilities; scoped overrides only)._
