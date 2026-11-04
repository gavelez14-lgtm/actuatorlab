"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ComponentId } from "@/lib/sim/types";
import { mechanismFor } from "@/lib/sim/mechanisms";
import { adaptForValve, componentsFor } from "@/data/components";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { SceneLabel } from "./SceneLabel";

/**
 * Exploded view. Every part is wrapped in a Pick group tagged with its
 * component id, so the explode is generic: each part moves away from the
 * model centre in proportion to its distance (a scaled explode), and parts
 * enclosed in a housing also lift out of the top so they can be seen.
 * Offsets are applied to the Pick groups only, never to the groups the
 * simulation moves, so the mechanism keeps working while exploded.
 */

/** Spread factor at full explode: offset = (part centre - model centre) * SPREAD. */
const SPREAD = 0.9;
/** Extra lift for parts that sit inside a housing (scene units at full explode). */
const LIFT: Partial<Record<ComponentId, number>> = {
  yoke: 0.95,
  pin: 0.65,
  "output-shaft": 1.45,
  "connecting-mechanism": 0.35,
  "guide-bar": 0.2,
  pinion: 0.85,
  rack: 0.4,
  "worm-wheel": 0.8,
  worm: 0.45,
  "torque-sensor": 0.55,
  encoder: 1.0,
  "spur-gears": 0.6,
  "limit-switches": 0.75,
  "torque-switch": 0.55,
  "dome-indicator": 0.6,
  "stem-nut": 0.65,
  "local-controls": 0.2,
};
/** Valve-side parts drop instead of lifting. */
const DROP: Partial<Record<ComponentId, number>> = { bracket: 0.25, stem: 0.35, ball: 0.55, "valve-body": 0.85, gate: 0.4, bonnet: 0.2 };

interface Part {
  obj: THREE.Object3D;
  id: ComponentId;
  base: THREE.Vector3;
  /** Offset at full explode, in the part's parent frame. */
  local: THREE.Vector3;
  /** Part centre in world space at explode 0 (for callouts). */
  centre: THREE.Vector3;
  world: THREE.Vector3;
}

function collect(root: THREE.Object3D): Part[] {
  root.updateWorldMatrix(true, true);
  const groups: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o !== root && o.userData?.component) groups.push(o);
  });
  const boxes = groups.map((g) => new THREE.Box3().setFromObject(g, true));
  const all = new THREE.Box3();
  boxes.forEach((b) => !b.isEmpty() && all.union(b));
  const centre = all.getCenter(new THREE.Vector3());
  return groups.map((obj, i) => {
    const id = obj.userData.component as ComponentId;
    const c = boxes[i].isEmpty() ? obj.getWorldPosition(new THREE.Vector3()) : boxes[i].getCenter(new THREE.Vector3());
    const world = c.clone().sub(centre).multiplyScalar(SPREAD);
    world.y += (LIFT[id] ?? 0) - (DROP[id] ?? 0);
    // convert the world-space offset into the parent's frame
    const parent = obj.parent!;
    const a = parent.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    const b = parent.worldToLocal(obj.getWorldPosition(new THREE.Vector3()).add(world));
    return { obj, id, base: obj.position.clone(), local: b.sub(a), centre: c, world };
  });
}

export function ExplodeView({ root }: { root: React.RefObject<THREE.Group | null> }) {
  const { engine, camera } = useEngine();
  const fittedFor = useRef<number | null>(null);
  const explode = useSimSelector((s) => s.explode);
  const family = useSimSelector((s) => s.config.family);
  const yoke = useSimSelector((s) => s.config.yoke);
  const actionType = useSimSelector((s) => s.config.actionType);
  const valve = useSimSelector((s) => s.config.valve);
  const invalidate = useThree((s) => s.invalidate);
  const parts = useRef<Part[] | null>(null);
  const key = `${family}|${yoke}|${actionType}|${valve}`;
  const builtFor = useRef("");
  const shown = useRef(0);
  // Bumped once the parts are collected, so callouts can be placed (the root does not exist on first render).
  const [version, setVersion] = useState(0);
  // The canvas renders on demand: start the animation when the target changes.
  useEffect(() => invalidate(), [explode, invalidate]);

  useFrame((_, delta) => {
    const r = root.current;
    if (!r) return;
    const target = engine.getState().explode;
    // (Re)collect from the assembled pose whenever the model changes.
    if (builtFor.current !== key || !parts.current) {
      parts.current?.forEach((p) => p.obj.position.copy(p.base));
      if (shown.current > 0 && target === 0) shown.current = 0;
      parts.current = collect(r);
      builtFor.current = key;
      setVersion((v) => v + 1);
    }
    // Ease toward the target so the explode animates.
    const prev = shown.current;
    shown.current += (target - shown.current) * Math.min(1, delta * 7);
    if (Math.abs(target - shown.current) < 0.002) shown.current = target;
    if (prev === shown.current && prev === 0) return;
    const k = shown.current;
    for (const p of parts.current) p.obj.position.copy(p.base).addScaledVector(p.local, k);
    if (shown.current !== target) invalidate();
    // Frame the whole (dis)assembly once the animation settles on a new target.
    else if (fittedFor.current !== target) {
      fittedFor.current = target;
      if (target > 0 || prev !== 0) camera.current?.fit();
    }
  });

  const kind = mechanismFor(family);
  const isolate = useSimSelector((s) => s.isolate);
  const selected = useSimSelector((s) => s.selectedComponent);
  // Numbered balloons in parts-list order (the Components tab shows the same numbers).
  const labels = useMemo(() => {
    if (explode < 0.5) return [];
    const r = root.current;
    if (!r) return [];
    const ps = parts.current ?? collect(r);
    const order = partNumbers(kind, family, valve);
    const seen = new Map<ComponentId, THREE.Vector3>();
    for (const p of ps) {
      if (seen.has(p.id) || !order.has(p.id)) continue;
      seen.set(p.id, p.centre.clone().addScaledVector(p.world, explode));
    }
    return [...seen.entries()]
      .filter(([id]) => !isolate || !selected || id === selected)
      .map(([id, pos]) => ({ id, pos, n: order.get(id)!.n, name: order.get(id)!.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explode, kind, family, key, isolate, selected, version]);

  return (
    <>
      {labels.map((l) =>
        isolate && selected === l.id ? (
          <SceneLabel key={l.id} position={l.pos}>
            {l.n}. {l.name}
          </SceneLabel>
        ) : (
          <SceneLabel key={l.id} position={l.pos} className="sim-label sim-label--num">
            {l.n}
          </SceneLabel>
        ),
      )}
    </>
  );
}

/** Part numbers in the order the Components tab lists them. */
export function partNumbers(kind: ReturnType<typeof mechanismFor>, family: Parameters<typeof componentsFor>[1], valve?: "ball" | "butterfly" | "plug") {
  const list = adaptForValve(componentsFor(kind, family), valve);
  return new Map(list.map((c, i) => [c.id, { n: i + 1, name: c.name }]));
}
