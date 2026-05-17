import { gsap } from "./register.mjs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Hide a full-screen splash layer (`[data-splash-layer]`). */
export function splashExit(layer, options = {}) {
  if (!layer) return null;
  if (prefersReducedMotion()) {
    return gsap.set(layer, { autoAlpha: 0, pointerEvents: "none" });
  }
  return gsap.to(layer, {
    autoAlpha: 0,
    duration: 0.4,
    ease: "power2.in",
    onComplete: () => {
      layer.style.pointerEvents = "none";
    },
    ...options,
  });
}
