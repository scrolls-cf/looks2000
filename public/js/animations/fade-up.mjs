import { gsap } from "./register.mjs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Fade + rise in. Respects prefers-reduced-motion. */
export function fadeUp(targets, options = {}) {
  if (prefersReducedMotion()) {
    return gsap.set(targets, { autoAlpha: 1, y: 0 });
  }
  return gsap.from(targets, {
    autoAlpha: 0,
    y: 20,
    duration: 0.55,
    ease: "power2.out",
    stagger: 0.06,
    ...options,
  });
}
