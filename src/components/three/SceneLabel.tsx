"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Minimal DOM label anchored to a 3D point.
 *
 * Replaces drei's <Html> for our labels: drei removes its element with
 * parent.removeChild (throws if the element is already detached during a route
 * change) and unmounts its inner React root synchronously during render. This
 * version detaches with el.remove() and defers the root unmount.
 */
export function SceneLabel({ position, children, className = "sim-label" }: { position: [number, number, number] | THREE.Vector3; children: ReactNode; className?: string }) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const el = useMemo(() => {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;will-change:transform;z-index:5;";
    return d;
  }, []);
  const root = useRef<Root | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    const parent = gl.domElement.parentNode as HTMLElement | null;
    parent?.appendChild(el);
    const r = createRoot(el);
    root.current = r;
    return () => {
      el.remove();
      root.current = null;
      queueMicrotask(() => r.unmount());
    };
  }, [gl, el]);

  useLayoutEffect(() => {
    root.current?.render(<div className={className} style={{ transform: "translate(-50%, -50%)" }}>{children}</div>);
  });

  useFrame(() => {
    if (!group.current) return;
    group.current.getWorldPosition(tmp);
    tmp.project(camera);
    const behind = tmp.z > 1;
    el.style.display = behind ? "none" : "block";
    const x = (tmp.x * 0.5 + 0.5) * size.width;
    const y = (-tmp.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  const pos = position instanceof THREE.Vector3 ? (position.toArray() as [number, number, number]) : position;
  return <group ref={group} position={pos} />;
}
