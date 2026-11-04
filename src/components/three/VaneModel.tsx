"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CHAMBER_A0, CHAMBER_B1, VANE, vaneAngle } from "@/lib/sim/vaneGeometry";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick } from "./parts";
import { ValveAssembly } from "./ValveAssembly";
import { AirSystem, type AirLayout } from "./AirSystem";

/*
 * Angle convention: a direction at angle a (about Y) is (sin a, 0, -cos a),
 * so the chamber sits behind the shaft (-Z) and the yoke-style rotation
 * group uses rotation.y = -a.
 */
const dirAt = (a: number, r: number, y = 0) => new THREE.Vector3(r * Math.sin(a), y, -r * Math.cos(a));
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const TOP = VANE.halfY;
const PORT_R = 0.36;
const PORT_A = dirAt(CHAMBER_A0 + 0.16, PORT_R, TOP + 0.02);
const PORT_B = dirAt(CHAMBER_B1 - 0.16, PORT_R, TOP + 0.02);
const BLOCK = v(0, TOP + 0.13, 0.36);

const VANE_AIR: AirLayout = {
  curves: {
    toA: new THREE.CatmullRomCurve3([v(-0.18, TOP + 0.13, 0.25), v(-0.3, TOP + 0.16, 0.0), PORT_A.clone().setY(TOP + 0.12), PORT_A.clone()]),
    toB: new THREE.CatmullRomCurve3([v(0.18, TOP + 0.13, 0.25), v(0.3, TOP + 0.16, 0.0), PORT_B.clone().setY(TOP + 0.12), PORT_B.clone()]),
    supply: new THREE.CatmullRomCurve3([v(0, TOP + 0.13, 0.48), v(0, TOP + 0.05, 0.75), v(0, -0.2, 0.9), v(0, -0.6, 0.95)]),
    exhaust: new THREE.CatmullRomCurve3([v(0.25, TOP + 0.13, 0.36), v(0.45, TOP + 0.15, 0.4), v(0.65, TOP + 0.22, 0.45)]),
    breather: new THREE.CatmullRomCurve3([PORT_B.clone(), PORT_B.clone().setY(TOP + 0.2), PORT_B.clone().setY(TOP + 0.4)]),
  },
  chambers: () => ({ a: [], b: [] }),
  block: { position: BLOCK, size: [0.46, 0.18, 0.24] },
  portA: PORT_A,
  portB: PORT_B,
  silencer: { position: v(0.3, TOP + 0.13, 0.36), rotation: [0, 0, Math.PI / 2] },
  supplyInlet: v(0, -0.6, 0.95),
  labels: { supply: v(0, -0.7, 0.95), exhaust: v(0.7, TOP + 0.32, 0.45), breather: PORT_B.clone().setY(TOP + 0.5) },
};

/** Sector case outline: a little wider than the chamber, with a hub round the shaft. */
const CASE = {
  a0: CHAMBER_A0 - 0.14,
  a1: CHAMBER_B1 + 0.14,
  hubR: 0.3,
  ribs: [-0.6, -0.2, 0.2, 0.6],
} as const;
/** Bolts round the parting flange: along the arc, both radial edges and the hub. */
const caseBolts: [number, number][] = (() => {
  const out: [number, number][] = [];
  const r = VANE.drumR + 0.025;
  for (let i = 0; i <= 8; i++) {
    const a = CASE.a0 + ((CASE.a1 - CASE.a0) * i) / 8;
    out.push([r * Math.sin(a), -r * Math.cos(a)]);
  }
  for (const a of [CASE.a0 - 0.08, CASE.a1 + 0.08])
    for (const rr of [0.36, 0.47]) out.push([rr * Math.sin(a), -rr * Math.cos(a)]);
  for (let i = 1; i < 6; i++) {
    const a = CASE.a1 + 0.3 + ((Math.PI * 2 - (CASE.a1 - CASE.a0) - 0.6) * i) / 6;
    out.push([(CASE.hubR + 0.025) * Math.sin(a), -(CASE.hubR + 0.025) * Math.cos(a)]);
  }
  return out;
})();

/** Flat ring sector whose angles are updated in place (no per-frame allocation). */
const SECTOR_SEGMENTS = 24;
function makeSector() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SECTOR_SEGMENTS + 1) * 2 * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < SECTOR_SEGMENTS; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setIndex(idx);
  return g;
}
function setSector(g: THREE.BufferGeometry, a0: number, a1: number, r0: number, r1: number) {
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i <= SECTOR_SEGMENTS; i++) {
    const a = a0 + ((a1 - a0) * i) / SECTOR_SEGMENTS;
    p.setXYZ(i * 2, r0 * Math.sin(a), 0, -r0 * Math.cos(a));
    p.setXYZ(i * 2 + 1, r1 * Math.sin(a), 0, -r1 * Math.cos(a));
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
}

export function VaneModel({ mats, onSelect, onHover, rootRef }: { mats: MaterialSet; onSelect: (id: ComponentId) => void; onHover: (id: ComponentId | null) => void; rootRef?: React.RefObject<THREE.Group | null> }) {
  const { engine } = useEngine();
  const cutaway = useSimSelector((s) => s.cutaway);
  const showLabels = useSimSelector((s) => s.showLabels);
  const mode = useSimSelector((s) => s.mode);
  const pick = { onSelect, onHover };

  const cutRef = useRef<CutawayStyle>(cutaway);
  cutRef.current = cutaway;
  const shellRaycast = useMemo(
    () =>
      makeShellRaycast(
        () => (cutRef.current === "section" ? [SECTION_PLANE] : []),
        () => cutRef.current === "ghost",
      ),
    [],
  );

  const geo = useMemo(() => {
    // The chamber's curved outer wall (the case is a separate sector shell below).
    const chamberSpan = CHAMBER_B1 - CHAMBER_A0;
    // CylinderGeometry theta is measured from +Z toward +X; ours from -Z toward +X.
    const toTheta = (a: number) => Math.PI - a;
    // Sector-shaped case (as photographed): a fan following the vane swing, shaft at the apex.
    const caseShape = (grow: number) => {
      const sh = new THREE.Shape();
      const R = VANE.drumR + grow;
      const Rh = CASE.hubR + grow;
      const n = 40;
      // shape (x, y) maps to world (x, -z): direction a -> (sin a, cos a)
      for (let i = 0; i <= n; i++) {
        const a = CASE.a0 - grow * 0.4 + ((CASE.a1 - CASE.a0 + grow * 0.8) * i) / n;
        const pt: [number, number] = [R * Math.sin(a), R * Math.cos(a)];
        if (i === 0) sh.moveTo(...pt);
        else sh.lineTo(...pt);
      }
      const back = Math.PI * 2 - (CASE.a1 - CASE.a0 + grow * 0.8);
      for (let i = 0; i <= n; i++) {
        const a = CASE.a1 + grow * 0.4 + (back * i) / n;
        sh.lineTo(Rh * Math.sin(a), Rh * Math.cos(a));
      }
      sh.closePath();
      return sh;
    };
    const extrude = (shape: THREE.Shape, depth: number, bevel: number) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
      g.rotateX(-Math.PI / 2);
      g.translate(0, -depth / 2, 0);
      return g;
    };
    const skin = extrude(caseShape(0), VANE.halfY * 2 - 0.08, 0.04);
    const flange = extrude(caseShape(0.05), 0.06, 0);
    const wall = new THREE.CylinderGeometry(VANE.chamberR, VANE.chamberR, VANE.chamberHalfY * 2, 48, 1, true, toTheta(CHAMBER_B1), chamberSpan);
    return { skin, flange, wall, secA: makeSector(), secB: makeSector() };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const fillA = useMemo(() => new THREE.MeshBasicMaterial({ color: "#5DB7EE", transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }), []);
  const fillB = useMemo(() => new THREE.MeshBasicMaterial({ color: "#C3C9D0", transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      fillA.dispose();
      fillB.dispose();
    },
    [fillA, fillB],
  );
  const secARef = useRef<THREE.Mesh>(null);
  const secBRef = useRef<THREE.Mesh>(null);

  const shaft = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const couplingOffset = Math.PI / 4;

  useFrame(() => {
    const s = engine.getState();
    const a = vaneAngle(s.stroke);
    if (shaft.current) shaft.current.rotation.y = -a;
    if (ball.current) ball.current.rotation.y = -a + couplingOffset;
    const active = mode === "energy";
    const paint = (mesh: THREE.Mesh | null, g: THREE.BufferGeometry, a0: number, a1: number, cond: string, mat: THREE.MeshBasicMaterial) => {
      if (!mesh) return;
      mesh.visible = active && (cond === "supply" || (cond === "exhaust" && s.airFlowing));
      if (!mesh.visible) return;
      setSector(g, a0, a1, VANE.hubR + 0.01, VANE.chamberR - 0.01);
      mat.color.set(cond === "supply" ? "#5DB7EE" : "#C3C9D0");
      mat.opacity = cond === "supply" ? 0.38 : 0.14;
    };
    paint(secARef.current, geo.secA, CHAMBER_A0, a - VANE.vaneHalf, s.chamberA, fillA);
    paint(secBRef.current, geo.secB, a + VANE.vaneHalf, CHAMBER_B1, s.chamberB, fillB);
  });

  const vaneLen = VANE.chamberR - VANE.hubR - 0.01;
  const vaneW = 2 * VANE.hubR * Math.sin(VANE.vaneHalf) * 2.2;

  return (
    <group ref={rootRef}>
      <Pick id="housing" {...pick}>
        {/* two cast outer cases (upper and lower), sector-shaped, bolted round a parting flange */}
        <mesh geometry={geo.skin} material={mats.vaneCase} raycast={shellRaycast} />
        <mesh geometry={geo.flange} material={mats.vaneCase} raycast={shellRaycast} />
        {caseBolts.map(([x, z]) => (
          <mesh key={`${x.toFixed(3)}${z.toFixed(3)}`} position={[x, 0.045, z]} material={mats.vaneFixings}>
            <cylinderGeometry args={[0.017, 0.017, 0.022, 6]} />
          </mesh>
        ))}
        {/* radial stiffening ribs across the top and bottom of the case */}
        {[-1, 1].flatMap((sy) =>
          CASE.ribs.map((a) => (
            <mesh
              key={`rib${sy}${a}`}
              position={dirAt(a, (CASE.hubR + VANE.drumR) / 2, sy * (VANE.halfY - 0.005))}
              rotation={[0, -a, 0]}
              material={mats.vaneCase}
              raycast={shellRaycast}
            >
              <boxGeometry args={[0.04, 0.05, VANE.drumR - CASE.hubR - 0.06]} />
            </mesh>
          )),
        )}
        {/* integral NAMUR manifold pad on the case's side face */}
        <RoundedBox
          args={[0.06, 0.2, 0.26]}
          radius={0.015}
          smoothness={2}
          position={dirAt(CASE.a1, (CASE.hubR + VANE.drumR) / 2).add(dirAt(CASE.a1 + Math.PI / 2, 0.04))}
          rotation={[0, -CASE.a1, 0]}
          material={mats.vaneCase}
          raycast={shellRaycast}
        />
        <mesh geometry={geo.wall} material={mats.endCaps} raycast={shellRaycast} />
        {/* chamber end walls (abutments) */}
        {[CHAMBER_A0, CHAMBER_B1].map((a) => (
          <mesh key={a} position={dirAt(a, (VANE.hubR + VANE.chamberR) / 2)} rotation={[0, -a, 0]} material={mats.endCaps} raycast={shellRaycast}>
            <boxGeometry args={[0.02, VANE.chamberHalfY * 2, VANE.chamberR - VANE.hubR]} />
          </mesh>
        ))}
        {/* NAMUR accessory mount boss */}
        <mesh position={[0, VANE.halfY + 0.03, 0]} material={mats.vaneCase} raycast={shellRaycast}>
          <cylinderGeometry args={[0.2, 0.22, 0.06, 40]} />
        </mesh>
      </Pick>

      {/* bi-directional travel stops: stainless stop bolts through the case at each chamber end */}
      <Pick id="travel-stops" {...pick}>
        {[CHAMBER_A0, CHAMBER_B1].map((a) => (
          <group key={a} position={dirAt(a, VANE.drumR + 0.06)} rotation={[0, -a, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.vaneStops}>
              <cylinderGeometry args={[0.03, 0.03, 0.16, 14]} />
            </mesh>
            <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]} material={mats.vaneStops}>
              <cylinderGeometry args={[0.052, 0.052, 0.04, 6]} />
            </mesh>
          </group>
        ))}
      </Pick>

      <mesh ref={secARef} geometry={geo.secA} material={fillA} visible={false} position={[0, VANE.chamberHalfY - 0.03, 0]} renderOrder={5} />
      <mesh ref={secBRef} geometry={geo.secB} material={fillB} visible={false} position={[0, VANE.chamberHalfY - 0.03, 0]} renderOrder={5} />

      <group ref={shaft} rotation={[0, -vaneAngle(0), 0]}>
        <Pick id="piston" {...pick}>
          {/* the vane: a blade on the hub, sealed at its edges */}
          <mesh position={[0, 0, -(VANE.hubR + vaneLen / 2)]} material={mats.piston}>
            <boxGeometry args={[vaneW, VANE.chamberHalfY * 2 - 0.01, vaneLen]} />
          </mesh>
          <mesh position={[0, 0, -(VANE.chamberR - 0.012)]} material={mats.pistonSeal}>
            <boxGeometry args={[vaneW + 0.006, VANE.chamberHalfY * 2 - 0.004, 0.02]} />
          </mesh>
        </Pick>
        <Pick id="output-shaft" {...pick}>
          <mesh material={mats.yoke}>
            <cylinderGeometry args={[VANE.hubR, VANE.hubR, VANE.chamberHalfY * 2, 32]} />
          </mesh>
          <mesh position={[0, -0.24, 0]} material={mats.shaft}>
            <cylinderGeometry args={[0.085, 0.085, 1.36, 24]} />
          </mesh>
          <mesh position={[0, -0.68, 0]} material={mats.stem}>
            <cylinderGeometry args={[0.13, 0.13, 0.24, 6]} />
          </mesh>
          {/* NAMUR shaft end under a red dome cap; the black stripe runs parallel to the vane */}
          <group position={[0, VANE.halfY + 0.12, 0]}>
            <mesh material={mats.shaft}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 24]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} scale={[1, 0.75, 1]} material={mats.domeRed}>
              <sphereGeometry args={[0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[0, 0.062, 0]} scale={[1, 0.77, 1]} material={mats.domeBlack}>
              <sphereGeometry args={[0.132, 32, 16, (3 * Math.PI) / 2 - 0.1, 0.2, 0, Math.PI / 2]} />
            </mesh>
          </group>
        </Pick>
        {showLabels && <Label position={[0, 0.42, -0.4]}>Vane: rotates with the shaft</Label>}
      </group>

      <ValveAssembly mats={mats} pick={pick} ballRef={ball} ballRotation={-vaneAngle(0) + couplingOffset} cutaway={cutaway} showLabels={showLabels} />
      <AirSystem mats={mats} springReturn={false} active={mode === "energy"} layout={VANE_AIR} />
    </group>
  );
}
