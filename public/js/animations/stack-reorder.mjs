import { gsap } from "./register.mjs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function captureRects(children) {
  return new Map(children.map((el) => [el, el.getBoundingClientRect()]));
}

/**
 * FLIP-style list resort after vote-driven reorder.
 * Call with a callback that mutates child order (sort + re-append), then animates y + opacity.
 *
 * @param {HTMLElement} listEl - container whose direct children are rows
 * @param {() => void} reorderFn - re-sort DOM children (runs immediately)
 * @param {object} [options] - gsap tween overrides (duration, ease, stagger)
 * @returns {import("gsap").core.Timeline | import("gsap").core.Tween | void}
 */
export function stackReorder(listEl, reorderFn, options = {}) {
  if (!listEl || typeof reorderFn !== "function") return;

  const children = [...listEl.children];
  if (children.length < 2) {
    reorderFn();
    return;
  }

  const first = captureRects(children);
  reorderFn();

  if (prefersReducedMotion()) {
    return gsap.set(listEl.children, { clearProps: "transform,opacity" });
  }

  const { duration = 0.42, ease = "power2.out", stagger = 0.02, ...rest } = options;
  const tl = gsap.timeline({ defaults: { duration, ease } });

  [...listEl.children].forEach((el, index) => {
    const before = first.get(el);
    if (!before) return;

    const after = el.getBoundingClientRect();
    const dy = before.top - after.top;
    if (Math.abs(dy) < 1) return;

    gsap.killTweensOf(el);
    gsap.set(el, { y: dy, opacity: 0.88, force3D: true });
    tl.to(
      el,
      {
        y: 0,
        opacity: 1,
        force3D: true,
        clearProps: "transform,opacity",
        ...rest,
      },
      index * stagger,
    );
  });

  return tl;
}
