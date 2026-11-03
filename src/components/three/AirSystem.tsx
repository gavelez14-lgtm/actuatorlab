"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CYLINDER, PISTON, YOKE_OFFSET, pistonXFromStroke } from "@/lib/sim/geometry";
import type { ChamberCondition } from "@/lib/sim/types";
import { useEngine } from "@/components/sim/SimulationProvider";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { MaterialSet } from "./materials";

/**
 * Illustrative pneumatic circuit: a directional control valve block on the
 * cylinder, tubing to each port, supply inlet, exhaust silencer and (for
 * spring-return) a breather on the spring-side chamber.
 *
 * The moving markers show DIRECTION of air movement only. This is not CFD,
 * and marker speed does not represent flow rate.
 */

const Z = -YOKE_OFFSET;
const BLOCK = new THREE.Vector3(1.67, 0.53, Z);
const PORT_A = new THREE.Vector3(CYLINDER.innerCapStart + 0.05, 0.47, Z);
const PORT_B = new THREE.Vector3(CYLINDER.tubeEnd + 0.05, 0.47, Z);

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// All curves are defined in the direction "from the control block outward".
const CURVES = {
  toA: new THREE.CatmullRomCurve3([v(1.42, 0.53, Z), v(1.18, 0.56, Z), v(1.03, 0.62, Z), PORT_A.clone()]),
  toB: new THREE.CatmullRomCurve3([v(1.92, 0.53, Z), v(2.16, 0.56, Z), v(2.31, 0.62, Z), PORT_B.clone()]),
  supply: new THREE.CatmullRomCurve3([v(1.67, 0.53, Z - 0.15), v(1.67, 0.56, Z - 0.6), v(1.67, 0.3, Z - 1.0), v(1.67, -0.35, Z - 1.15)]),
  exhaust: new THREE.CatmullRomCurve3([v(1.67, 0.53, Z + 0.15), v(1.67, 0.53, Z + 0.4), v(1.67, 0.6, Z + 0.75)]),
  breather: new THREE.CatmullRomCurve3([PORT_B.clone().setY(0.5), PORT_B.clone().setY(0.68), PORT_B.clone().setY(0.9)]),
};
type CurveKey = keyof typeof CURVES;

interface Stream {
  curve: CurveKey;
  /** +1 = along the curve definition, -1 = reversed. */
  dir: 1 | -1;
  kind: "supply" | "exhaust";
}

const MARKERS_PER_STREAM = 7;
const MAX_STREAMS = 5;
const SUPPLY_COLOR = new THREE.Color("#5DB7EE");
const EXHAUST_COLOR = new THREE.Color("#C3C9D0");

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
  // de-duplicate shared trunk segments
  return out.filter((s, i) => out.findIndex((o) => o.curve === s.curve && o.dir === s.dir) === i).slice(0, MAX_STREAMS);
}

export function AirSystem({ mats, springReturn, active }: { mats: MaterialSet; springReturn: boolean; active: boolean }) {
  const { engine } = useEngine();
  const reduced = usePrefersReducedMotion();

  const tubes = useMemo(() => {
    const make = (c: THREE.Curve<THREE.Vector3>) => new THREE.TubeGeometry(c, 40, 0.022, 8, false);
    return {
      toA: make(CURVES.toA),
      toB: make(CURVES.toB),
      supply: make(CURVES.supply),
    };
  }, []);
  useEffect(() => () => Object.values(tubes).forEach((g) => g.dispose()), [tubes]);

  const markers = useRef<THREE.InstancedMesh>(null);
  const chamberA = useRef<THREE.Mesh>(null);
  const chamberB = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const markerGeo = useMemo(() => new THREE.ConeGeometry(0.03, 0.085, 10).rotateX(Math.PI / 2), []);
  const markerMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const fillGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 40).rotateZ(Math.PI / 2), []);
  const fillA = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), []);
  const fillB = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), []);
  useEffect(
    () => () => {
      markerGeo.dispose();
      markerMat.dispose();
      fillGeo.dispose();
      fillA.dispose();
      fillB.dispose();
    },
    [markerGeo, markerMat, fillGeo, fillA, fillB],
  );

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), t: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), f: new THREE.Vector3(0, 0, 1) }),
    [],
  );

  useFrame((_, delta) => {
    const s = engine.getState();
    // chamber volumes follow the piston
    const px = pistonXFromStroke(s.stroke);
    const aStart = CYLINDER.tubeStart;
    const aEnd = px - PISTON.thickness / 2;
    const bStart = px + PISTON.thickness / 2;
    const bEnd = CYLINDER.tubeEnd;
    const r = CYLINDER.boreRadius - 0.012;
    const paint = (mesh: THREE.Mesh | null, mat: THREE.MeshBasicMaterial, x0: number, x1: number, cond: ChamberCondition) => {
      if (!mesh) return;
      const len = Math.max(0.001, x1 - x0);
      mesh.position.set((x0 + x1) / 2, 0, Z);
      mesh.scale.set(len, r, r);
      const show = active && (cond === "supply" || (cond === "exhaust" && s.airFlowing));
      mesh.visible = show;
      if (show) {
        mat.color.copy(cond === "supply" ? SUPPLY_COLOR : EXHAUST_COLOR);
        mat.opacity = cond === "supply" ? 0.38 : 0.14;
      }
    };
    paint(chamberA.current, fillA, aStart, aEnd, s.chamberA);
    paint(chamberB.current, fillB, bStart, bEnd, s.chamberB);

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
      const curve = CURVES[st.curve];
      for (let i = 0; i < MARKERS_PER_STREAM; i++) {
        let u = (phase.current + i / MARKERS_PER_STREAM) % 1;
        if (st.dir < 0) u = 1 - u;
        curve.getPointAt(u, tmp.p);
        curve.getTangentAt(u, tmp.t);
        if (st.dir < 0) tmp.t.negate();
        tmp.q.setFromUnitVectors(tmp.f, tmp.t.normalize());
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        im.setMatrixAt(n, tmp.m);
        im.setColorAt(n, st.kind === "supply" ? SUPPLY_COLOR : EXHAUST_COLOR);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* control valve block on a mounting plate across the top tie rods */}
      <mesh position={[BLOCK.x, 0.385, Z]} material={mats.controlBlock}>
        <boxGeometry args={[0.55, 0.03, 0.78]} />
      </mesh>
      <mesh position={BLOCK} material={mats.controlBlock}>
        <boxGeometry args={[0.5, 0.22, 0.3]} />
      </mesh>
      {/* solenoid coil */}
      <mesh position={[BLOCK.x + 0.12, BLOCK.y + 0.17, Z]} material={mats.housingTrim}>
        <boxGeometry args={[0.16, 0.12, 0.16]} />
      </mesh>
      <mesh geometry={tubes.toA} material={mats.tubing} />
      <mesh geometry={tubes.supply} material={mats.tubing} />
      {springReturn ? (
        <mesh position={[PORT_B.x, PORT_B.y + 0.07, Z]} material={mats.fitting}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 14]} />
        </mesh>
      ) : (
        <mesh geometry={tubes.toB} material={mats.tubing} />
      )}
      {/* port fittings */}
      {[PORT_A, PORT_B].map((p, i) => (
        <mesh key={i} position={[p.x, p.y - 0.02, Z]} material={mats.fitting}>
          <cylinderGeometry args={[0.035, 0.035, 0.06, 12]} />
        </mesh>
      ))}
      {/* exhaust silencer */}
      <mesh position={[BLOCK.x, BLOCK.y, Z + 0.24]} rotation={[Math.PI / 2, 0, 0]} material={mats.fitting}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 14]} />
      </mesh>
      {/* supply inlet fitting */}
      <mesh position={[1.67, -0.35, Z - 1.15]} material={mats.fitting}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
      </mesh>

      <mesh ref={chamberA} geometry={fillGeo} material={fillA} visible={false} raycast={() => null} />
      <mesh ref={chamberB} geometry={fillGeo} material={fillB} visible={false} raycast={() => null} />
      <instancedMesh ref={markers} args={[markerGeo, markerMat, MARKERS_PER_STREAM * MAX_STREAMS]} raycast={() => null} frustumCulled={false} />

      {active && (
        <>
          <Html position={[1.67, -0.45, Z - 1.15]} center style={{ pointerEvents: "none" }}>
            <div className="sim-label sim-label--air">Supply in</div>
          </Html>
          <Html position={[1.67, 0.72, Z + 0.75]} center style={{ pointerEvents: "none" }}>
            <div className="sim-label">Exhaust</div>
          </Html>
          {springReturn && (
            <Html position={[PORT_B.x, 1.0, Z]} center style={{ pointerEvents: "none" }}>
              <div className="sim-label">Breather</div>
            </Html>
          )}
        </>
      )}
    </group>
  );
}
