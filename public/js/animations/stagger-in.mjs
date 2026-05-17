import { gsap } from "./register.mjs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Staggered scale + fade for lists and grids. */
export function staggerIn(targets, options = {}) {
  if (prefersReducedMotion()) {
    return gsap.set(targets, { autoAlpha: 1, scale: 1 });
  }
  return gsap.from(targets, {
    autoAlpha: 0,
    scale: 0.96,
    duration: 0.45,
    ease: "power2.out",
    stagger: { amount: 0.35, from: "start" },
    ...options,
  });
}
