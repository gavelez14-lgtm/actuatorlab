"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders children only once the placeholder is near the viewport, so heavy
 * code (the 3D engine) is not downloaded for content the visitor never reaches.
 * Once mounted it stays mounted.
 */
export function LazyMount({
  children,
  className,
  rootMargin = "600px 0px",
  fallback = null,
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
