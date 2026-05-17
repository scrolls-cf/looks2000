# Fleet GSAP presets

Browser-only modules. Copy into app `public/js/animations/` or bundle from your client entry.

```js
import { registerGsap, fadeUp, splashExit } from "./animations/index.mjs";
import { ScrollTrigger } from "gsap/ScrollTrigger";

registerGsap(ScrollTrigger);
fadeUp(".hero-copy");
```

| Module | Purpose |
|--------|---------|
| `register.mjs` | One-time `gsap.registerPlugin(...)` |
| `fade-up.mjs` | Fade + rise |
| `stagger-in.mjs` | List/grid entrance |
| `splash-exit.mjs` | Dismiss `[data-splash-layer]` |
| `page-enter.mjs` | Hero + main timeline |

All presets honor **`prefers-reduced-motion`**. Do not import from the Worker — see `docs/gsap-for-agents.md`.
