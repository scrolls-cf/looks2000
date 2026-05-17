# Anti-patterns and mistakes log

**Audience:** AI coding agents and maintainers. These files are what agents should **avoid** repeating. For the full tree map, read [`../README.md`](../README.md).

**Sad path:** some docs call anti-patterns the **sad path**; in this repo that is **`patterns/errors/`** (paired with **`patterns/goldpath/`** for the fix).

**Rule:** after fixing a non-trivial bug or CI failure, add or update an entry here (paired with `../goldpath/`) per [`.cursor/rules/document-fixes-in-patterns.mdc`](../../.cursor/rules/document-fixes-in-patterns.mdc).

Append entries when you encounter **incorrect, fragile, or misleading code** in this codebase or in examples you almost copied.

## Browser and gateway client (`fetch`, multi-step UX)

| Sad path (`errors/`) | Gold path (`goldpath/`) |
| --- | --- |
| [`browser-single-fetch-fake-progress.md`](./browser-single-fetch-fake-progress.md) | [`browser-async-chaining-multi-step-ui.md`](../goldpath/browser-async-chaining-multi-step-ui.md) |
| [`browser-rendering-budget-exhausted.md`](./browser-rendering-budget-exhausted.md) | [`browser-rendering-quick-actions-phase2.md`](../goldpath/browser-rendering-quick-actions-phase2.md) |

## Design and UI (DaisyUI + Tailwind + forms)

| Sad path (`errors/`) | Gold path (`goldpath/`) |
| --- | --- |
| [`daisyui-tailwind-v4-config.md`](./daisyui-tailwind-v4-config.md) | [`daisyui.md`](../goldpath/daisyui.md), [`daisyui-tailwind-minimal-drift.md`](../goldpath/daisyui-tailwind-minimal-drift.md), [`../../docs/daisyui.md`](../../docs/daisyui.md) |
| [`daisyui-5-legacy-form-class-names.md`](./daisyui-5-legacy-form-class-names.md) | [`daisyui-5-form-fields-markup.md`](../goldpath/daisyui-5-form-fields-markup.md) |
| [`daisyui-5-textarea-wrapper-ux.md`](./daisyui-5-textarea-wrapper-ux.md) | [`daisyui-5-form-fields-markup.md`](../goldpath/daisyui-5-form-fields-markup.md) |
| [`tailwind-typography-missing-utilities.md`](./tailwind-typography-missing-utilities.md) | [`tailwind-typography-v4-cli.md`](../goldpath/tailwind-typography-v4-cli.md) |

## Motion (GSAP)

| Sad path (`errors/`) | Gold path (`goldpath/`) |
| --- | --- |
| [`gsap-in-worker-isolate.md`](./gsap-in-worker-isolate.md) | [`gsap-static-client-cloudflare-worker.md`](../goldpath/gsap-static-client-cloudflare-worker.md) |
| [`gsap-layout-props-for-motion.md`](./gsap-layout-props-for-motion.md) | [`gsap-prefer-transforms.md`](../goldpath/gsap-prefer-transforms.md) |
| [`gsap-plugins-not-registered.md`](./gsap-plugins-not-registered.md) | [`gsap-browser-public-bundle.md`](../goldpath/gsap-browser-public-bundle.md) |
| [`gsap-scrolltrigger-without-registerplugin.md`](./gsap-scrolltrigger-without-registerplugin.md) | [`gsap-browser-public-bundle.md`](../goldpath/gsap-browser-public-bundle.md) |

## Entry format

Use one markdown file per theme or one dated log—keep it consistent with `../goldpath/`.

Suggested fields per entry:

- **Date** — ISO date
- **Context** — file path or feature
- **Bad pattern** — short description or fenced code block
- **Why it is wrong** — failure mode, security, or maintenance cost
- **Fix / reference** — link to issue, PR, or `../goldpath/` entry

Optional YAML frontmatter (`kind: anti-pattern`, `topics`, `date`) at the top of each entry helps agents find files by topic; see [`../README.md`](../README.md).

Do not log sensitive data (tokens, secrets, PII).
