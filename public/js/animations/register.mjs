import gsap from "gsap";

let registered = false;

/** Register GSAP plugins once per page. Returns the shared gsap instance. */
export function registerGsap(...plugins) {
  if (plugins.length) {
    gsap.registerPlugin(...plugins);
  }
  registered = true;
  return gsap;
}

export function isGsapRegistered() {
  return registered;
}

export { gsap };
