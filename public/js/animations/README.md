# Fleet GSAP — splash first

Browser-only. Copy into `public/js/animations/` or import from your client bundle.

## Splash dismiss

```js
import { registerGsap, splashExit, splashDismiss } from "./animations/index.mjs";

registerGsap();
const layer = document.querySelector("[data-splash-layer]");
layer?.setAttribute("data-splash-active", "");

// Generic fleet event:
splashExit(layer);

// scrollsmatrix gateway (same tween, existing event name):
splashDismiss(layer);
```

| Export | Purpose |
|--------|---------|
| `splashExit` | Fade out `[data-splash-layer]`; fires `scrollsdesigner:splash-dismissed` |
| `splashDismiss` | Same; fires `scrollsmatrix:splash-dismissed` |

Markup: **`components/splash.html`**. Full breakout sequence lives in **scrollsmatrix** `public/assets/landing.js`.

Other presets (`fadeUp`, `staggerIn`, …) remain for apps that import them; fleet CSS is palette + splash only.
