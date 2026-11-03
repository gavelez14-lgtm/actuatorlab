"use client";

import { useSyncExternalStore } from "react";

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = subscribeMedia(reducedQuery);

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

let webglCache: boolean | null = null;
export function detectWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

const noop = () => () => {};
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noop, detectWebGL, () => null);
}

/** True after hydration. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
