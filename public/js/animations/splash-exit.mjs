import { gsap } from "./register.mjs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Hide a full-screen splash (`[data-splash-layer]`).
 * Dispatches `scrollsdesigner:splash-dismissed` unless `dismissEvent` is null.
 */
export function splashExit(layer, options = {}) {
  if (!layer) return null;

  const {
    dismissEvent = "scrollsdesigner:splash-dismissed",
    onDismiss,
    duration = 0.55,
    ...tweenOptions
  } = options;

  const finish = () => {
    layer.style.pointerEvents = "none";
    layer.removeAttribute("data-splash-active");
    layer.setAttribute("aria-hidden", "true");
    onDismiss?.();
    if (dismissEvent && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(dismissEvent));
    }
  };

  if (prefersReducedMotion()) {
    gsap.set(layer, { autoAlpha: 0 });
    finish();
    return null;
  }

  return gsap.to(layer, {
    autoAlpha: 0,
    duration,
    ease: "power2.in",
    onComplete: finish,
    ...tweenOptions,
  });
}

/** Alias for gateway apps that already listen for scrollsmatrix:splash-dismissed. */
export function splashDismiss(layer, options = {}) {
  return splashExit(layer, {
    dismissEvent: "scrollsmatrix:splash-dismissed",
    ...options,
  });
}
