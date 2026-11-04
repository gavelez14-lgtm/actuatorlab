"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SceneLabel } from "./SceneLabel";
import { CYLINDER, PISTON, YOKE_OFFSET, cylinderScale, pistonXFromStroke, yokeKinematics } from "@/lib/sim/geometry";
import type { ChamberCondition, SimulationState } from "@/lib/sim/types";
import { useEngine } from "@/components/sim/SimulationProvider";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { MaterialSet } from "./materials";

/**
 * Illustrative pneumatic circuit: a directional control valve block, tubing to
 * each port, supply inlet, exhaust silencer and (for spring-return) a breather
 * on the spring-side chamber. Each mechanism supplies an AirLayout.
 *
 * The moving markers show DIRECTION of air movement only. This is not CFD,
 * and marker speed does not represent flow rate.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export type CurveKey = "toA" | "toB" | "supply" | "exhaust" | "breather";

/** A cylindrical chamber volume along X at (y, z) with radius r. */
export interface ChamberSegment {
  x0: number;
  x1: number;
  y: number;
  z: number;
  r: number;
}

export interface AirLayout {
  /** All curves run "from the control block outward". */
  curves: Record<CurveKey, THREE.CatmullRomCurve3>;
  /** Chamber A (drives stroke 0 -> 1) and chamber B volumes at a stroke. */
  chambers: (stroke: number, config: SimulationState["config"]) => { a: ChamberSegment[]; b: ChamberSegment[] };
  block: { position: THREE.Vector3; size: [number, number, number] };
  mountPlate?: { position: THREE.Vector3; size: [number, number, number] };
  portA: THREE.Vector3;
  portB: THREE.Vector3;
  /** Rotation for port fittings and breather (default: vertical). */
  portRotation?: [number, number, number];
  silencer: { position: THREE.Vector3; rotation: [number, number, number] };
  supplyInlet: THREE.Vector3;
  labels: { supply: THREE.Vector3; exhaust: THREE.Vector3; breather: THREE.Vector3 };
}

/* Scotch yoke layout: block sits on the cylinder tie rods. */
const Z = -YOKE_OFFSET;
const SY_PORT_A = v(CYLINDER.innerCapStart + 0.05, 0.47, Z);
const SY_PORT_B = v(CYLINDER.tubeEnd + 0.05, 0.47, Z);
export const SCOTCH_YOKE_AIR: AirLayout = {
  curves: {
    toA: new THREE.CatmullRomCurve3([v(1.42, 0.53, Z), v(1.18, 0.56, Z), v(1.03, 0.62, Z), SY_PORT_A.clone()]),
    toB: new THREE.CatmullRomCurve3([v(1.92, 0.53, Z), v(2.16, 0.56, Z), v(2.31, 0.62, Z), SY_PORT_B.clone()]),
    supply: new THREE.CatmullRomCurve3([v(1.67, 0.53, Z - 0.15), v(1.67, 0.56, Z - 0.6), v(1.67, 0.3, Z - 1.0), v(1.67, -0.35, Z - 1.15)]),
    exhaust: new THREE.CatmullRomCurve3([v(1.67, 0.53, Z + 0.15), v(1.67, 0.53, Z + 0.4), v(1.67, 0.6, Z + 0.75)]),
    breather: new THREE.CatmullRomCurve3([SY_PORT_B.clone().setY(0.5), SY_PORT_B.clone().setY(0.68), SY_PORT_B.clone().setY(0.9)]),
  },
  chambers: (stroke, config) => {
    const px = pistonXFromStroke(stroke, yokeKinematics(config));
    const cs = cylinderScale(config.family);
    const r = CYLINDER.boreRadius * cs - 0.012;
    // The model lowers the whole air system with a slimmer bore; keep the chamber volumes on the cylinder axis.
    const y = (1 - cs) * 0.43;
    return {
      a: [{ x0: CYLINDER.tubeStart, x1: px - PISTON.thickness / 2, y, z: Z, r }],
      b: [{ x0: px + PISTON.thickness / 2, x1: CYLINDER.tubeEnd, y, z: Z, r }],
    };
  },
  block: { position: v(1.67, 0.53, Z), size: [0.5, 0.22, 0.3] },
  mountPlate: { position: v(1.67, 0.385, Z), size: [0.55, 0.03, 0.78] },
  portA: SY_PORT_A,
  portB: SY_PORT_B,
  silencer: { position: v(1.67, 0.53, Z + 0.24), rotation: [Math.PI / 2, 0, 0] },
  supplyInlet: v(1.67, -0.35, Z - 1.15),
  labels: { supply: v(1.67, -0.45, Z - 1.15), exhaust: v(1.67, 0.72, Z + 0.75), breather: v(SY_PORT_B.x, 1.0, Z) },
};

interface Stream {
  curve: CurveKey;
  /** +1 = along the curve definition, -1 = reversed. */
  dir: 1 | -1;
  kind: "supply" | "exhaust";
}

const MARKERS_PER_STREAM = 7;
const MAX_STREAMS = 5;
const MAX_SEGMENTS = 2; // per chamber
const SUPPLY_COLOR = new THREE.Color("#5DB7EE");
const EXHAUST_COLOR = new THREE.Color("#C3C9D0");
const OIL_COLOR = new THREE.Color("#E3A12B");
const OIL_RETURN_COLOR = new THREE.Color("#9C7A3C");

function streamsFor(a: ChamberCondition, b: ChamberCondition, springReturn: boolean, velocity: number): Stream[] {
  const out: Stream[] = [];
  const add = (chamber: "A" | "B", cond: ChamberCondition) => {
    const curve: CurveKey = chamber === "A" ? "toA" : "toB";
    if (cond === "supply") {
      out.push({ curve: "supply", dir: -1, kind: "supply" }, { curve, dir: 1, kind: "supply" });
    } else if (cond === "exhaust") {
      out.push({ curve, dir: -1, kind: "exhaust" }, { curve: "exhaust", dir: 1, kind: "exhaust" });
    }
  };
  add("A", a);
  if (!springReturn) add("B", b);
  if (springReturn) {
    // Chamber B shrinks on the air stroke (expels through breather) and grows on the spring stroke (draws in).
    out.push({ curve: "breather", dir: velocity > 0 ? 1 : -1, kind: "exhaust" });
  }
  return out.filter((s, i) => out.findIndex((o) => o.curve === s.curve && o.dir === s.dir) === i).slice(0, MAX_STREAMS);
}

export function AirSystem({
  mats,
  springReturn,
  active,
  layout = SCOTCH_YOKE_AIR,
  oil = false,
}: {
  /** Show the working fluid as oil (gas over oil) instead of air or gas. */
  oil?: boolean;
  mats: MaterialSet;
  springReturn: boolean;
  active: boolean;
  layout?: AirLayout;
}) {
  const { engine } = useEngine();
  const reduced = usePrefersReducedMotion();
  const C = layout.curves;

  const tubes = useMemo(() => {
    const make = (c: THREE.Curve<THREE.Vector3>) => new THREE.TubeGeometry(c, 40, 0.022, 8, false);
    return { toA: make(C.toA), toB: make(C.toB), supply: make(C.supply) };
  }, [C]);
  useEffect(() => () => Object.values(tubes).forEach((g) => g.dispose()), [tubes]);

  const markers = useRef<THREE.InstancedMesh>(null);
  const fillRefs = useRef<(THREE.Mesh | null)[]>([]);
  const phase = useRef(0);
  const markerGeo = useMemo(() => new THREE.ConeGeometry(0.03, 0.085, 10).rotateX(Math.PI / 2), []);
  const markerMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const fillGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 40).rotateZ(Math.PI / 2), []);
  const fillMats = useMemo(
    () => Array.from({ length: MAX_SEGMENTS * 2 }, () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })),
    [],
  );
  useEffect(
    () => () => {
      markerGeo.dispose();
      markerMat.dispose();
      fillGeo.dispose();
      fillMats.forEach((m) => m.dispose());
    },
    [markerGeo, markerMat, fillGeo, fillMats],
  );

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), t: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), f: new THREE.Vector3(0, 0, 1) }),
    [],
  );

  useFrame((_, delta) => {
    const s = engine.getState();
    const ch = layout.chambers(s.stroke, s.config);
    const paintChamber = (segs: ChamberSegment[], cond: ChamberCondition, offset: number) => {
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        const mesh = fillRefs.current[offset + i];
        if (!mesh) continue;
        const seg = segs[i];
        const show = !!seg && active && (cond === "supply" || (cond === "exhaust" && s.airFlowing));
        mesh.visible = show;
        if (!seg || !show) continue;
        const len = Math.max(0.001, seg.x1 - seg.x0);
        mesh.position.set((seg.x0 + seg.x1) / 2, seg.y, seg.z);
        mesh.scale.set(len, seg.r, seg.r);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.copy(cond === "supply" ? (oil ? OIL_COLOR : SUPPLY_COLOR) : oil ? OIL_RETURN_COLOR : EXHAUST_COLOR);
        mat.opacity = cond === "supply" ? 0.38 : 0.14;
      }
    };
    paintChamber(ch.a, s.chamberA, 0);
    paintChamber(ch.b, s.chamberB, MAX_SEGMENTS);

    const im = markers.current;
    if (!im) return;
    if (!active || !s.airFlowing) {
      im.count = 0;
      im.instanceMatrix.needsUpdate = true;
      return;
    }
    if (!reduced && s.playing) phase.current = (phase.current + delta * 0.55 * Math.max(0.4, s.speed)) % 1;
    const streams = streamsFor(s.chamberA, s.chamberB, springReturn, s.velocity);
    let n = 0;
    for (const st of streams) {
      const curve = C[st.curve];
      for (let i = 0; i < MARKERS_PER_STREAM; i++) {
        let u = (phase.current + i / MARKERS_PER_STREAM) % 1;
        if (st.dir < 0) u = 1 - u;
        curve.getPointAt(u, tmp.p);
        curve.getTangentAt(u, tmp.t);
        if (st.dir < 0) tmp.t.negate();
        tmp.q.setFromUnitVectors(tmp.f, tmp.t.normalize());
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        im.setMatrixAt(n, tmp.m);
        im.setColorAt(n, st.kind === "supply" ? (oil ? OIL_COLOR : SUPPLY_COLOR) : oil ? OIL_RETURN_COLOR : EXHAUST_COLOR);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  const portRot = layout.portRotation ?? [0, 0, 0];
  return (
    <group>
      {layout.mountPlate && (
        <mesh position={layout.mountPlate.position} material={mats.controlBlock}>
          <boxGeometry args={layout.mountPlate.size} />
        </mesh>
      )}
      <mesh position={layout.block.position} material={mats.controlBlock}>
        <boxGeometry args={layout.block.size} />
      </mesh>
      {/* solenoid coil */}
      <mesh position={[layout.block.position.x + 0.12, layout.block.position.y + layout.block.size[1] / 2 + 0.06, layout.block.position.z]} material={mats.housingTrim}>
        <boxGeometry args={[0.16, 0.12, 0.16]} />
      </mesh>
      <mesh geometry={tubes.toA} material={mats.tubing} />
      <mesh geometry={tubes.supply} material={mats.tubing} />
      {springReturn ? (
        <group position={layout.portB} rotation={portRot}>
          <mesh position={[0, 0.07, 0]} material={mats.fitting}>
            <cylinderGeometry args={[0.045, 0.045, 0.1, 14]} />
          </mesh>
        </group>
      ) : (
        <mesh geometry={tubes.toB} material={mats.tubing} />
      )}
      {[layout.portA, layout.portB].map((p, i) => (
        <group key={i} position={p} rotation={portRot}>
          <mesh position={[0, -0.02, 0]} material={mats.fitting}>
            <cylinderGeometry args={[0.035, 0.035, 0.06, 12]} />
          </mesh>
        </group>
      ))}
      <mesh position={layout.silencer.position} rotation={layout.silencer.rotation} material={mats.fitting}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 14]} />
      </mesh>
      <mesh position={layout.supplyInlet} material={mats.fitting}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
      </mesh>

      {fillMats.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            fillRefs.current[i] = el;
          }}
          geometry={fillGeo}
          material={m}
          visible={false}
          raycast={() => null}
        />
      ))}
      <instancedMesh ref={markers} args={[markerGeo, markerMat, MARKERS_PER_STREAM * MAX_STREAMS]} raycast={() => null} frustumCulled={false} />

      {active && (
        <>
          <SceneLabel position={layout.labels.supply} className="sim-label sim-label--air">{oil ? "Oil in" : "Supply in"}</SceneLabel>
          <SceneLabel position={layout.labels.exhaust} className="sim-label">{oil ? "Return to tank" : "Exhaust"}</SceneLabel>
          {springReturn && (
            <SceneLabel position={layout.labels.breather} className="sim-label">Breather</SceneLabel>
          )}
        </>
      )}
    </group>
  );
}
