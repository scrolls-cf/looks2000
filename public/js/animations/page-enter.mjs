import { gsap } from "./register.mjs";
import { fadeUp } from "./fade-up.mjs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Standard page shell: optional hero, then main content blocks. */
export function pageEnter({ hero, main } = {}, options = {}) {
  if (prefersReducedMotion()) {
    const all = [hero, main].filter(Boolean);
    return gsap.set(all, { autoAlpha: 1, y: 0 });
  }
  const tl = gsap.timeline({ defaults: { ease: "power2.out" }, ...options });
  if (hero) {
    tl.from(hero, { autoAlpha: 0, y: 12, duration: 0.5 });
  }
  if (main) {
    tl.add(fadeUp(main, { duration: 0.5 }), hero ? "-=0.2" : 0);
  }
  return tl;
}
