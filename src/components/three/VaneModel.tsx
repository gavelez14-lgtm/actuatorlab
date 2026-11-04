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
    // Drum with the chamber cut out: a lathe of the outer skin plus a solid "filler" for the non-chamber sector.
    const chamberSpan = CHAMBER_B1 - CHAMBER_A0;
    const fillerStart = CHAMBER_B1;
    const fillerLen = Math.PI * 2 - chamberSpan;
    // CylinderGeometry thetaStart is measured from +Z toward +X; convert from our convention (from -Z toward +X).
    const toTheta = (a: number) => Math.PI - a;
    const filler = new THREE.CylinderGeometry(VANE.chamberR + 0.005, VANE.chamberR + 0.005, VANE.chamberHalfY * 2, 48, 1, false, toTheta(fillerStart + fillerLen), fillerLen);
    const skin = new THREE.CylinderGeometry(VANE.drumR, VANE.drumR, VANE.halfY * 2, 64, 1, true);
    const wall = new THREE.CylinderGeometry(VANE.chamberR, VANE.chamberR, VANE.chamberHalfY * 2, 48, 1, true, toTheta(CHAMBER_B1), chamberSpan);
    return { filler, skin, wall, secA: makeSector(), secB: makeSector() };
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
        {/* two cast outer cases (upper and lower), joined at a bolted parting flange */}
        <mesh geometry={geo.skin} material={mats.vaneCase} raycast={shellRaycast} />
        {[-1, 1].map((sg) => (
          <mesh key={sg} position={[0, sg * (VANE.halfY - 0.04), 0]} material={mats.vaneCase} raycast={shellRaycast}>
            <cylinderGeometry args={[VANE.drumR + 0.015, VANE.drumR + 0.015, 0.08, 64]} />
          </mesh>
        ))}
        <mesh material={mats.vaneCase} raycast={shellRaycast}>
          <cylinderGeometry args={[VANE.drumR + 0.05, VANE.drumR + 0.05, 0.07, 64]} />
        </mesh>
        <mesh material={mats.knob} raycast={shellRaycast}>
          <cylinderGeometry args={[VANE.drumR + 0.052, VANE.drumR + 0.052, 0.006, 64]} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2 + Math.PI / 12).map((a) => (
          <mesh key={a} position={[(VANE.drumR + 0.03) * Math.sin(a), 0.045, (VANE.drumR + 0.03) * Math.cos(a)]} material={mats.vaneFixings}>
            <cylinderGeometry args={[0.018, 0.018, 0.022, 6]} />
          </mesh>
        ))}
        {/* cast stiffening ribs running over the case */}
        {Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2).map((a) => (
          <mesh key={`rib${a}`} position={[(VANE.drumR + 0.012) * Math.sin(a), 0, (VANE.drumR + 0.012) * Math.cos(a)]} rotation={[0, a, 0]} material={mats.vaneCase} raycast={shellRaycast}>
            <boxGeometry args={[0.035, VANE.halfY * 2 - 0.1, 0.03]} />
          </mesh>
        ))}
        {/* integral NAMUR manifold pad for a direct-mount solenoid */}
        <RoundedBox args={[0.3, 0.2, 0.06]} radius={0.015} smoothness={2} position={[0.33, 0.12, VANE.drumR - 0.08]} rotation={[0, 0.55, 0]} material={mats.vaneCase} raycast={shellRaycast} />
        {/* solid body around the chamber (non-chamber sector) and the chamber's curved wall */}
        <mesh geometry={geo.filler} material={mats.vaneCase} raycast={shellRaycast} />
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
