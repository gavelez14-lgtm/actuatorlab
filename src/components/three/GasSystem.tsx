"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CYLINDER, PISTON, VALVE, YOKE_OFFSET, pinXFromStroke, yokeKinematics } from "@/lib/sim/geometry";
import { GAS } from "@/lib/sim/gas";
import type { ComponentId } from "@/lib/sim/types";
import { useEngine } from "@/components/sim/SimulationProvider";
import type { MaterialSet } from "./materials";
import { Label, Pick } from "./parts";

/**
 * Pipeline-gas hardware around the Scotch yoke, laid out after the product
 * renders on the maker's website (original geometry; no marks or dimensions):
 *
 * Direct gas (HPG-style): a tandem hydraulic override cylinder; an upright red
 * hand pump with bellows and a tall lever on the centre body; a red direction
 * valve with a black handle; a stainless control cabinet with a white junction
 * box; stainless tubing; an optional power-gas storage tank.
 *
 * Gas over oil (GO-style): a red frame on top of the actuator carrying two tall
 * domed gas/oil tanks, a control manifold between them with two poppet-valve
 * stacks and open/closed selector knobs, and a stainless cabinet with a white
 * junction box; two hand pumps on the frame.
 */
const Z = -YOKE_OFFSET;
/** Override cylinder, coaxial beyond the gas cylinder's outer cap. */
export const OVERRIDE = { x0: 2.5, x1: 3.8, outer: 0.2, bore: 0.16, pistonOffset: 3.14 } as const;
/** Tanks and controls stand on the operator side (+Z), clear of the valve and pipe. */
export const GAS_FRONT_Z = 0.8;
const TANK = { x: 1.67, z: GAS_FRONT_Z, y0: -1.3, y1: -0.48, r: 0.2 } as const;

type PickProps = { onSelect: (id: ComponentId) => void; onHover: (id: ComponentId | null) => void };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Parts that move with the piston: tail rod and override piston (mounted inside the slider group). */
export function OverrideSliderParts({ mats, pick, shift = 0 }: { mats: MaterialSet; pick: PickProps; shift?: number }) {
  const rodStart = PISTON.rodLength + PISTON.thickness / 2 + shift;
  const rodEnd = OVERRIDE.pistonOffset + shift;
  return (
    <Pick id="hydraulic-override" {...pick}>
      <mesh position={[(rodStart + rodEnd) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.rod}>
        <cylinderGeometry args={[0.035, 0.035, rodEnd - rodStart, 14]} />
      </mesh>
      <mesh position={[OVERRIDE.pistonOffset + shift, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hydPiston}>
        <cylinderGeometry args={[OVERRIDE.bore - 0.006, OVERRIDE.bore - 0.006, 0.08, 32]} />
      </mesh>
    </Pick>
  );
}

/** GO frame and the parts it carries (operator side, above the actuator). */
const GO = {
  frame: { x0: -0.35, x1: 2.6, y: 0.56, z: 0.42 },
  tanks: [
    { x: 0.62, side: "A" as const },
    { x: 1.72, side: "B" as const },
  ],
  tank: { y0: 0.02, y1: 1.55, r: 0.19, z: 0.62 },
  manifold: { x: 1.17, y: 0.56, z: 0.6 },
  cabinet: { x: 2.3, y: 1.06, z: 0.56 },
  pumps: [
    { x: -0.18, label: "open" },
    { x: 0.16, label: "close" },
  ],
} as const;

/** HPG controls on and beside the centre body. */
const HPG = {
  pump: { x: 0.62, z: 0.06 },
  valve: { x: 1.32, y: 0.52, z: 0.08 },
  cabinet: { x: -0.52, y: 0.56, z: -0.62 },
} as const;

export function GasSystem({ mats, pick, showLabels, shellRaycast, overOil = false }: { mats: MaterialSet; pick: PickProps; showLabels: boolean; shellRaycast: THREE.Mesh["raycast"]; overOil?: boolean }) {
  const { engine } = useEngine();
  const levels = useRef<(THREE.Mesh | null)[]>([]);
  const lever = useRef<THREE.Group>(null);
  const goLevers = useRef<(THREE.Group | null)[]>([]);
  const needle = useRef<THREE.Group>(null);
  const oilA = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const tube = (pts: THREE.Vector3[], r = 0.016) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, r, 8, false);
    const pipeTop = VALVE.centerY + VALVE.pipeRadius;
    const portA = v(CYLINDER.innerCapStart + 0.05, 0.3, Z + 0.12);
    const portB = v(CYLINDER.tubeEnd + 0.05, 0.3, Z + 0.12);
    const M = GO.manifold;
    const T = GO.tank;
    return {
      // ---- direct gas
      tap: tube([v(-0.02, pipeTop - 0.02, 1.05), v(-0.02, pipeTop + 0.2, 1.05), v(0.5, -1.42, TANK.z), v(1.2, -1.46, TANK.z), v(TANK.x, TANK.y0 - 0.1, TANK.z)], 0.02),
      feed: tube([v(TANK.x, TANK.y1 + 0.06, TANK.z), v(TANK.x, 0.05, 0.62), v(1.3, 0.4, 0.3), v(HPG.valve.x, HPG.valve.y, HPG.valve.z + 0.06)]),
      sense: tube([v(0.5, -1.42, TANK.z), v(-0.3, -0.9, 0.7), v(-0.6, 0.0, 0.2), v(HPG.cabinet.x, HPG.cabinet.y - 0.2, HPG.cabinet.z + 0.2)], 0.013),
      pumpLine: tube([v(HPG.pump.x + 0.1, 0.4, HPG.pump.z), v(0.95, 0.55, HPG.pump.z + 0.05), v(HPG.valve.x - 0.12, HPG.valve.y, HPG.valve.z)]),
      hoseA: tube([v(HPG.valve.x + 0.12, HPG.valve.y, HPG.valve.z), v(2.0, 0.62, 0.0), v(2.55, 0.4, Z + 0.1), v(2.56, 0.22, Z + 0.1)]),
      hoseB: tube([v(HPG.valve.x + 0.12, HPG.valve.y + 0.03, HPG.valve.z - 0.04), v(2.6, 0.7, -0.1), v(3.66, 0.42, Z + 0.1), v(3.68, 0.22, Z + 0.1)]),
      // ---- gas over oil
      goTap: tube([v(-0.02, pipeTop - 0.02, 1.05), v(-0.02, pipeTop + 0.25, 1.05), v(0.4, -0.6, 0.95), v(0.95, 0.2, 0.8), v(M.x, M.y - 0.17, M.z)], 0.02),
      goGasA: tube([v(M.x - 0.1, M.y + 0.2, M.z), v(M.x - 0.2, T.y1 + 0.18, T.z), v(GO.tanks[0].x, T.y1 + 0.16, T.z)]),
      goGasB: tube([v(M.x + 0.1, M.y + 0.2, M.z), v(M.x + 0.2, T.y1 + 0.18, T.z), v(GO.tanks[1].x, T.y1 + 0.16, T.z)]),
      goOilA: tube([v(GO.tanks[0].x, T.y0 - 0.1, T.z), v(GO.tanks[0].x + 0.1, -0.05, 0.3), v(portA.x, 0.36, Z + 0.3), portA]),
      goOilB: tube([v(GO.tanks[1].x, T.y0 - 0.1, T.z), v(GO.tanks[1].x + 0.2, -0.05, 0.3), v(portB.x, 0.36, Z + 0.3), portB]),
      goConduit: tube([v(GO.cabinet.x - 0.08, 0.47, GO.cabinet.z + 0.08), v(GO.cabinet.x - 0.1, 0.1, 0.72), v(GO.cabinet.x - 0.3, -0.4, 0.75)], 0.02),
      goConduit2: tube([v(GO.cabinet.x + 0.08, 0.47, GO.cabinet.z + 0.08), v(GO.cabinet.x + 0.1, 0.1, 0.72), v(GO.cabinet.x + 0.2, -0.4, 0.75)], 0.02),
    };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  useFrame(() => {
    const s = engine.getState();
    if (lever.current) lever.current.rotation.z = 0.25 + 0.35 * Math.sin(s.gas.pumpPhase);
    // GO: the open pump works while pumping toward open, the close pump toward closed.
    goLevers.current.forEach((g, i) => {
      if (!g) return;
      const active = (i === 0 && s.gas.pumpDir > 0) || (i === 1 && s.gas.pumpDir < 0);
      g.rotation.z = 0.35 + (active ? 0.3 * Math.sin(s.gas.pumpPhase) : 0);
    });
    if (overOil) {
      const h = GO.tank.y1 - GO.tank.y0 - 0.06;
      [0.85 - 0.6 * s.stroke, 0.25 + 0.6 * s.stroke].forEach((lvl, i) => {
        const m = levels.current[i];
        if (!m) return;
        m.scale.y = lvl * h;
        m.position.y = GO.tank.y0 + 0.03 + (lvl * h) / 2;
      });
    }
    if (needle.current) needle.current.rotation.z = Math.PI * 0.75 - (s.gas.pipeline / GAS.pipelineMax) * Math.PI * 1.5;
    if (oilA.current) {
      // Oil column between the override cap and piston (shows when the housing is ghosted or sectioned).
      const k = yokeKinematics(s.config);
      const px = OVERRIDE.pistonOffset + k.shift + pinXFromStroke(s.stroke, k);
      const len = Math.max(0.01, OVERRIDE.x1 - 0.02 - (px + 0.04));
      // the cylinder is laid along X by a Z rotation, so its length is the local Y axis
      oilA.current.scale.y = len;
      oilA.current.position.x = px + 0.04 + len / 2;
    }
  });

  const len = OVERRIDE.x1 - OVERRIDE.x0;
  const T = GO.tank;

  /** Stainless cabinet with a white junction box and the pipeline gauge. */
  const cabinet = (x: number, y: number, z: number, faceZ: 1 | -1) => (
    <group position={[x, y, z]}>
      <RoundedBox args={[0.5, 0.42, 0.34]} radius={0.015} smoothness={2} material={mats.gasControl} />
      {/* lid lip and latch */}
      <mesh position={[0, 0.215, 0]} material={mats.gasControl}>
        <boxGeometry args={[0.52, 0.02, 0.36]} />
      </mesh>
      <mesh position={[0, -0.06, faceZ * 0.175]} rotation={[Math.PI / 2, 0, 0]} material={mats.domeBlack}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
      </mesh>
      {/* blank plate where a maker's label would sit */}
      <mesh position={[0, 0.08, faceZ * 0.172]} rotation={[0, faceZ < 0 ? Math.PI : 0, 0]} material={mats.junctionBox}>
        <planeGeometry args={[0.3, 0.14]} />
      </mesh>
      {/* pipeline pressure gauge on the side */}
      <group position={[0.26, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.bezel}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 32]} />
        </mesh>
        <mesh position={[0, 0, 0.011]} material={mats.gaugeFace}>
          <circleGeometry args={[0.088, 32]} />
        </mesh>
        <group ref={needle} position={[0, 0, 0.016]}>
          <mesh position={[0, 0.035, 0]} material={mats.gaugeNeedle}>
            <boxGeometry args={[0.008, 0.07, 0.003]} />
          </mesh>
        </group>
      </group>
      {/* white junction box below with cable glands */}
      <RoundedBox args={[0.34, 0.26, 0.12]} radius={0.015} smoothness={2} position={[0, -0.36, faceZ * 0.09]} material={mats.junctionBox} />
      {[-0.08, 0, 0.08].map((dx) => (
        <mesh key={dx} position={[dx, -0.51, faceZ * 0.09]} material={mats.gasLine}>
          <cylinderGeometry args={[0.018, 0.018, 0.05, 10]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <>
      {/* ================= Direct gas (HPG-style) ================= */}
      {!overOil && (
        <>
          <Pick id="hydraulic-override" {...pick}>
            <mesh position={[(CYLINDER.tubeEnd + 0.1 + OVERRIDE.x0) / 2, 0, Z]} rotation={[0, 0, Math.PI / 2]} material={mats.hydCylinder} raycast={shellRaycast}>
              <cylinderGeometry args={[0.13, 0.13, OVERRIDE.x0 - CYLINDER.tubeEnd - 0.1, 28]} />
            </mesh>
            <mesh position={[OVERRIDE.x0 + len / 2, 0, Z]} rotation={[0, 0, Math.PI / 2]} material={mats.hydCylinder} raycast={shellRaycast}>
              <cylinderGeometry args={[OVERRIDE.outer, OVERRIDE.outer, len, 36, 1, true]} />
            </mesh>
            {[OVERRIDE.x0, OVERRIDE.x1].map((x) => (
              <RoundedBox key={x} args={[0.08, 0.48, 0.48]} radius={0.02} smoothness={3} position={[x, 0, Z]} material={mats.endCaps} raycast={shellRaycast} />
            ))}
            <mesh ref={oilA} position={[OVERRIDE.x1 - 0.2, 0, Z]} rotation={[0, 0, Math.PI / 2]} material={mats.oil}>
              <cylinderGeometry args={[OVERRIDE.bore - 0.01, OVERRIDE.bore - 0.01, 1, 24]} />
            </mesh>
            <mesh geometry={geo.hoseA} material={mats.gasLine} />
            <mesh geometry={geo.hoseB} material={mats.gasLine} />
          </Pick>

          {/* upright hand pump on the centre body: painted body, black bellows, tall stainless lever */}
          <Pick id="hand-pump" {...pick}>
            <group position={[HPG.pump.x, 0.3, HPG.pump.z]}>
              <RoundedBox args={[0.22, 0.14, 0.2]} radius={0.02} smoothness={2} position={[0, 0.07, 0]} material={mats.pumpPaint} />
              {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={i} position={[0, 0.18 + i * 0.035, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.bellows}>
                  <torusGeometry args={[0.05, 0.016, 8, 20]} />
                </mesh>
              ))}
              <RoundedBox args={[0.14, 0.12, 0.14]} radius={0.02} smoothness={2} position={[0, 0.4, 0]} material={mats.pumpPaint} />
              <group ref={lever} position={[0.02, 0.46, 0]} rotation={[0, 0, 0.25]}>
                <mesh position={[0, 0.4, 0]} material={mats.pumpLever}>
                  <cylinderGeometry args={[0.018, 0.018, 0.8, 12]} />
                </mesh>
                <mesh position={[0, 0.82, 0]} material={mats.domeBlack}>
                  <capsuleGeometry args={[0.03, 0.09, 4, 12]} />
                </mesh>
              </group>
            </group>
            {/* direction valve with a black lever handle */}
            <group position={[HPG.valve.x, HPG.valve.y, HPG.valve.z]}>
              <RoundedBox args={[0.24, 0.1, 0.12]} radius={0.015} smoothness={2} material={mats.pumpPaint} />
              <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={mats.domeBlack}>
                <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
              </mesh>
              <mesh position={[0.1, 0, 0.1]} rotation={[0, 0, Math.PI / 2]} material={mats.domeBlack}>
                <cylinderGeometry args={[0.016, 0.016, 0.2, 10]} />
              </mesh>
            </group>
            <mesh geometry={geo.pumpLine} material={mats.gasLine} />
          </Pick>

          {/* optional power-gas storage tank behind a check valve */}
          <Pick id="gas-tank" {...pick}>
            <mesh position={[TANK.x, (TANK.y0 + TANK.y1) / 2, TANK.z]} material={mats.gasTank}>
              <cylinderGeometry args={[TANK.r, TANK.r, TANK.y1 - TANK.y0, 36]} />
            </mesh>
            {[TANK.y0, TANK.y1].map((y, i) => (
              <mesh key={y} position={[TANK.x, y, TANK.z]} scale={[1, 0.45, 1]} rotation={[i ? 0 : Math.PI, 0, 0]} material={mats.gasTank}>
                <sphereGeometry args={[TANK.r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
            ))}
            <mesh position={[TANK.x, TANK.y0 - 0.14, TANK.z]} material={mats.gasLine}>
              <cylinderGeometry args={[0.045, 0.045, 0.1, 6]} />
            </mesh>
          </Pick>

          {/* stainless control cabinet (line-break and local controls) on the centre body */}
          <Pick id="gas-controls" {...pick}>
            {cabinet(HPG.cabinet.x, HPG.cabinet.y, HPG.cabinet.z, 1)}
            <mesh geometry={geo.tap} material={mats.gasLine} />
            <mesh geometry={geo.feed} material={mats.gasLine} />
            <mesh geometry={geo.sense} material={mats.gasLine} />
            {/* particulate filter on the supply tap */}
            <mesh position={[0.32, -1.32, TANK.z]} material={mats.gasLine}>
              <cylinderGeometry args={[0.055, 0.045, 0.18, 20]} />
            </mesh>
          </Pick>
        </>
      )}

      {/* ================= Gas over oil (GO-style) ================= */}
      {overOil && (
        <>
          <Pick id="gas-tank" {...pick}>
            {/* red frame on top of the actuator carrying the tanks and controls */}
            <mesh position={[(GO.frame.x0 + GO.frame.x1) / 2, GO.frame.y, GO.frame.z]} material={mats.goFrame}>
              <boxGeometry args={[GO.frame.x1 - GO.frame.x0, 0.12, 0.1]} />
            </mesh>
            {[0.1, 2.3].map((x) => (
              <mesh key={x} position={[x, (0.3 + GO.frame.y) / 2, (GO.frame.z + 0.18) / 2]} material={mats.goFrame}>
                <boxGeometry args={[0.1, GO.frame.y - 0.3 + 0.06, GO.frame.z - 0.18 + 0.1]} />
              </mesh>
            ))}
            {GO.tanks.map((t, i) => (
              <group key={t.side}>
                <mesh position={[t.x, (T.y0 + T.y1) / 2, T.z]} material={mats.gasTank}>
                  <cylinderGeometry args={[T.r, T.r, T.y1 - T.y0, 32]} />
                </mesh>
                {[T.y0, T.y1].map((y, j) => (
                  <mesh key={y} position={[t.x, y, T.z]} scale={[1, 0.7, 1]} rotation={[j ? 0 : Math.PI, 0, 0]} material={mats.gasTank}>
                    <sphereGeometry args={[T.r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  </mesh>
                ))}
                {/* blank vessel plate */}
                <mesh position={[t.x, T.y1 - 0.35, T.z + T.r + 0.004]} material={mats.junctionBox}>
                  <boxGeometry args={[0.16, 0.14, 0.006]} />
                </mesh>
                {/* sight glass with the live oil level */}
                <mesh position={[t.x + 0.1, (T.y0 + T.y1) / 2, T.z + T.r - 0.04]} rotation={[0, 0.5, 0]} material={mats.knob}>
                  <boxGeometry args={[0.05, T.y1 - T.y0 - 0.1, 0.01]} />
                </mesh>
                <mesh
                  ref={(m) => {
                    levels.current[i] = m;
                  }}
                  position={[t.x + 0.105, T.y0 + 0.2, T.z + T.r - 0.032]}
                  rotation={[0, 0.5, 0]}
                  material={mats.oil}
                >
                  <boxGeometry args={[0.034, 1, 0.01]} />
                </mesh>
                <mesh position={[t.x, T.y0 - 0.16, T.z]} material={mats.gasLine}>
                  <cylinderGeometry args={[0.04, 0.04, 0.08, 6]} />
                </mesh>
              </group>
            ))}
            <mesh geometry={geo.goOilA} material={mats.gasLine} />
            <mesh geometry={geo.goOilB} material={mats.gasLine} />
          </Pick>

          {/* flow-control valves at the tank outlets */}
          <Pick id="flow-controls" {...pick}>
            {GO.tanks.map((t) => (
              <group key={t.side} position={[t.x + 0.12, T.y0 - 0.12, T.z + 0.1]}>
                <RoundedBox args={[0.12, 0.08, 0.1]} radius={0.012} smoothness={2} material={mats.pumpBody} />
                <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} material={mats.gaugeNeedle}>
                  <cylinderGeometry args={[0.025, 0.025, 0.04, 12]} />
                </mesh>
              </group>
            ))}
          </Pick>

          {/* control manifold between the tanks: poppet-valve stacks and open/closed selector knobs */}
          <Pick id="gas-controls" {...pick}>
            <RoundedBox args={[0.32, 0.36, 0.18]} radius={0.015} smoothness={2} position={[GO.manifold.x, GO.manifold.y, GO.manifold.z]} material={mats.pumpBody} />
            {[-0.075, 0.075].map((dx, i) => (
              <group key={dx} position={[GO.manifold.x + dx, GO.manifold.y, GO.manifold.z]}>
                <mesh position={[0, 0.27, 0]} material={mats.domeBlack}>
                  <cylinderGeometry args={[0.05, 0.05, 0.16, 20]} />
                </mesh>
                <mesh position={[0, 0.41, 0]} material={mats.gasLine}>
                  <cylinderGeometry args={[0.035, 0.035, 0.12, 16]} />
                </mesh>
                <mesh position={[0, 0.5, 0]} material={mats.domeBlack}>
                  <boxGeometry args={[0.05, 0.08, 0.05]} />
                </mesh>
                {/* selector knob with a pointer (closed / open) */}
                <mesh position={[0, -0.06, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={mats.junctionBox}>
                  <cylinderGeometry args={[0.055, 0.055, 0.01, 24]} />
                </mesh>
                <mesh position={[0, -0.06, 0.115]} rotation={[Math.PI / 2, 0, 0]} material={mats.domeBlack}>
                  <cylinderGeometry args={[0.032, 0.032, 0.03, 16]} />
                </mesh>
                <mesh position={[i ? 0.03 : -0.03, -0.06, 0.13]} rotation={[0, 0, Math.PI / 2]} material={mats.domeBlack}>
                  <cylinderGeometry args={[0.01, 0.01, 0.06, 8]} />
                </mesh>
              </group>
            ))}
            {cabinet(GO.cabinet.x, GO.cabinet.y, GO.cabinet.z, 1)}
            <mesh geometry={geo.goTap} material={mats.gasLine} />
            <mesh geometry={geo.goGasA} material={mats.gasLine} />
            <mesh geometry={geo.goGasB} material={mats.gasLine} />
            <mesh geometry={geo.goConduit} material={mats.junctionBox} />
            <mesh geometry={geo.goConduit2} material={mats.junctionBox} />
            {/* particulate filter on the supply tap */}
            <mesh position={[0.4, -0.6, 0.95]} material={mats.gasLine}>
              <cylinderGeometry args={[0.055, 0.045, 0.18, 20]} />
            </mesh>
          </Pick>

          {/* two hand pumps on the frame: one strokes the actuator open, the other closed */}
          <Pick id="hand-pump" {...pick}>
            {GO.pumps.map((pmp, i) => (
              <group key={pmp.label} position={[pmp.x, GO.frame.y + 0.06, GO.frame.z]}>
                <RoundedBox args={[0.16, 0.12, 0.14]} radius={0.015} smoothness={2} position={[0, 0.06, 0]} material={mats.pumpPaint} />
                {[0, 1, 2].map((k) => (
                  <mesh key={k} position={[0, 0.15 + k * 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.bellows}>
                    <torusGeometry args={[0.04, 0.013, 8, 18]} />
                  </mesh>
                ))}
                <group
                  ref={(g) => {
                    goLevers.current[i] = g;
                  }}
                  position={[0, 0.25, 0]}
                  rotation={[0, 0, 0.35]}
                >
                  <mesh position={[0, 0.25, 0]} material={mats.pumpLever}>
                    <cylinderGeometry args={[0.014, 0.014, 0.5, 10]} />
                  </mesh>
                  <mesh position={[0, 0.52, 0]} material={mats.domeBlack}>
                    <capsuleGeometry args={[0.024, 0.07, 4, 10]} />
                  </mesh>
                </group>
              </group>
            ))}
          </Pick>
        </>
      )}

      {showLabels && (
        <>
          {!overOil && <Label position={[OVERRIDE.x0 + len / 2, 0.42, Z - 0.3]}>Hydraulic override</Label>}
          {overOil ? <Label position={[0, GO.frame.y + 0.85, GO.frame.z]}>Hand pumps: open and close</Label> : <Label position={[HPG.pump.x, 1.55, HPG.pump.z]}>Hand pump</Label>}
          <Label position={overOil ? [1.17, T.y1 + 0.45, T.z] : [TANK.x, TANK.y1 + 0.42, TANK.z - 0.1]}>{overOil ? "Gas/oil tanks" : "Power gas storage"}</Label>
          <Label position={overOil ? [GO.cabinet.x, GO.cabinet.y + 0.4, GO.cabinet.z] : [HPG.cabinet.x, HPG.cabinet.y + 0.4, HPG.cabinet.z]}>Control cabinet</Label>
        </>
      )}
    </>
  );
}
