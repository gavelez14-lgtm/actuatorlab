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
 * Direct-gas hardware around the Scotch yoke: a tandem hydraulic override
 * cylinder with a hand pump, a reserve gas tank fed from the pipeline through
 * a check valve, and a line-break control with a pipeline pressure gauge.
 * Original, illustrative layout.
 */
const Z = -YOKE_OFFSET;
/** Override cylinder, coaxial beyond the gas cylinder's outer cap. */
export const OVERRIDE = { x0: 2.5, x1: 3.8, outer: 0.2, bore: 0.16, pistonOffset: 3.14 } as const;
/** Tanks and controls stand on the operator side (+Z), clear of the valve and pipe. */
export const GAS_FRONT_Z = 0.8;
const TANK = { x: 1.67, z: GAS_FRONT_Z, y0: -1.3, y1: -0.48, r: 0.2 } as const;
const CONTROL = { x: 0.92, y: -0.78, z: GAS_FRONT_Z } as const;

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

/** Gas-over-oil tanks: A feeds the opening side, B the closing side. */
const GO_TANKS = [
  { x: 1.4, side: "A" as const },
  { x: 1.94, side: "B" as const },
];
const GO_R = 0.17;
/** GO hand pumps beside the tanks: one strokes the actuator open, the other closed. */
const GO_PUMPS = [
  { x: 2.38, label: "open" },
  { x: 2.86, label: "close" },
] as const;

export function GasSystem({ mats, pick, showLabels, shellRaycast, overOil = false }: { mats: MaterialSet; pick: PickProps; showLabels: boolean; shellRaycast: THREE.Mesh["raycast"]; overOil?: boolean }) {
  const { engine } = useEngine();
  const levels = useRef<(THREE.Mesh | null)[]>([]);
  const lever = useRef<THREE.Group>(null);
  const goLevers = useRef<(THREE.Group | null)[]>([]);
  const needle = useRef<THREE.Group>(null);
  const oilA = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const tube = (pts: THREE.Vector3[], r = 0.018) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 8, false);
    const pipeTop = VALVE.centerY + VALVE.pipeRadius;
    return {
      tap: tube([v(-0.02, pipeTop - 0.02, 1.05), v(-0.02, pipeTop + 0.2, 1.05), v(0.5, -1.42, TANK.z), v(1.2, -1.46, TANK.z), v(TANK.x, TANK.y0 - 0.1, TANK.z)], 0.022),
      feed: tube([v(TANK.x, TANK.y1 + 0.06, TANK.z), v(TANK.x, 0.05, 0.62), v(1.45, 0.42, 0.15), v(1.45, 0.53, -0.38)], 0.018),
      sense: tube([v(0.5, -1.42, TANK.z), v(CONTROL.x, -1.3, TANK.z), v(CONTROL.x, -1.06, CONTROL.z)], 0.014),
      hoseA: tube([v(2.98, 0.24, Z + 0.06), v(2.75, 0.32, Z + 0.1), v(2.58, 0.22, Z + 0.1), v(2.56, 0.12, Z + 0.1)], 0.016),
      hoseB: tube([v(3.24, 0.24, Z + 0.06), v(3.45, 0.32, Z + 0.1), v(3.64, 0.22, Z + 0.1), v(3.66, 0.12, Z + 0.1)], 0.016),
    };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  useFrame(() => {
    const s = engine.getState();
    if (lever.current) lever.current.rotation.z = 0.55 + 0.32 * Math.sin(s.gas.pumpPhase);
    // GO: the open pump works while pumping toward open, the close pump toward closed.
    goLevers.current.forEach((g, i) => {
      if (!g) return;
      const active = (i === 0 && s.gas.pumpDir > 0) || (i === 1 && s.gas.pumpDir < 0);
      g.rotation.z = 0.55 + (active ? 0.32 * Math.sin(s.gas.pumpPhase) : 0);
    });
    if (overOil) {
      const h = TANK.y1 - TANK.y0 - 0.06;
      [0.85 - 0.6 * s.stroke, 0.25 + 0.6 * s.stroke].forEach((lvl, i) => {
        const m = levels.current[i];
        if (!m) return;
        m.scale.y = lvl * h;
        m.position.y = TANK.y0 + 0.03 + (lvl * h) / 2;
      });
    }
    if (needle.current) needle.current.rotation.z = Math.PI * 0.75 - (s.gas.pipeline / GAS.pipelineMax) * Math.PI * 1.5;
    if (oilA.current) {
      // Oil column between the override cap and piston (shows when the housing is ghosted or sectioned).
      const k = yokeKinematics(s.config);
      const px = OVERRIDE.pistonOffset + k.shift + pinXFromStroke(s.stroke, k);
      const len = Math.max(0.01, OVERRIDE.x1 - 0.02 - (px + 0.04));
      oilA.current.scale.x = len;
      oilA.current.position.x = px + 0.04 + len / 2;
    }
  });

  const len = OVERRIDE.x1 - OVERRIDE.x0;
  return (
    <>
      {/* ---------- Direct gas: tandem hydraulic override cylinder and hand pump ---------- */}
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
      </Pick>

      {/* ---------- Hand pump with reservoir and direction valve ---------- */}
      <Pick id="hand-pump" {...pick}>
        <RoundedBox args={[0.38, 0.14, 0.24]} radius={0.025} smoothness={3} position={[3.11, 0.27, Z]} material={mats.pumpBody} />
        <mesh position={[3.45, 0.42, Z - 0.02]} material={mats.pumpBody}>
          <cylinderGeometry args={[0.085, 0.085, 0.3, 24]} />
        </mesh>
        <mesh position={[3.45, 0.58, Z - 0.02]} material={mats.pumpLever}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 12]} />
        </mesh>
        {/* direction / release valve knob */}
        <mesh position={[3.11, 0.27, Z + 0.15]} rotation={[Math.PI / 2, 0, 0]} material={mats.gaugeNeedle}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
        </mesh>
        <mesh position={[2.98, 0.4, Z]} material={mats.pumpBody}>
          <boxGeometry args={[0.06, 0.12, 0.08]} />
        </mesh>
        <group ref={lever} position={[2.98, 0.45, Z]} rotation={[0, 0, 0.55]}>
          <mesh position={[0, 0.34, 0]} material={mats.pumpLever}>
            <cylinderGeometry args={[0.022, 0.022, 0.68, 12]} />
          </mesh>
          <mesh position={[0, 0.7, 0]} material={mats.knob}>
            <capsuleGeometry args={[0.035, 0.1, 4, 12]} />
          </mesh>
        </group>
        <mesh geometry={geo.hoseA} material={mats.knob} />
        <mesh geometry={geo.hoseB} material={mats.knob} />
      </Pick>
      </>
      )}

      {/* ---------- Gas over oil: two hand pumps, one per direction, feeding oil straight to the cylinder ---------- */}
      {overOil && (
        <Pick id="hand-pump" {...pick}>
          {GO_PUMPS.map((pmp, i) => (
            <group key={pmp.label} position={[pmp.x, -0.98, GAS_FRONT_Z + 0.06]}>
              <RoundedBox args={[0.26, 0.12, 0.2]} radius={0.02} smoothness={2} material={mats.pumpBody} />
              <mesh position={[0.17, 0.12, 0]} material={mats.pumpBody}>
                <cylinderGeometry args={[0.06, 0.06, 0.22, 20]} />
              </mesh>
              <mesh position={[-0.09, 0.11, 0]} material={mats.pumpBody}>
                <boxGeometry args={[0.05, 0.1, 0.07]} />
              </mesh>
              <group
                ref={(g) => {
                  goLevers.current[i] = g;
                }}
                position={[-0.09, 0.15, 0]}
                rotation={[0, 0, 0.55]}
              >
                <mesh position={[0, 0.26, 0]} material={mats.pumpLever}>
                  <cylinderGeometry args={[0.018, 0.018, 0.52, 12]} />
                </mesh>
                <mesh position={[0, 0.54, 0]} material={mats.knob}>
                  <capsuleGeometry args={[0.03, 0.08, 4, 12]} />
                </mesh>
              </group>
            </group>
          ))}
        </Pick>
      )}

      {overOil ? (
        <>
          {/* ---------- Two gas/oil tanks with sight-glass oil levels ---------- */}
          <Pick id="gas-tank" {...pick}>
            {GO_TANKS.map((t, i) => (
              <group key={t.side}>
                <mesh position={[t.x, (TANK.y0 + TANK.y1) / 2, TANK.z]} material={mats.gasTank}>
                  <cylinderGeometry args={[GO_R, GO_R, TANK.y1 - TANK.y0, 32]} />
                </mesh>
                {[TANK.y0, TANK.y1].map((y, j) => (
                  <mesh key={y} position={[t.x, y, TANK.z]} scale={[1, 0.45, 1]} rotation={[j ? 0 : Math.PI, 0, 0]} material={mats.gasTank}>
                    <sphereGeometry args={[GO_R, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  </mesh>
                ))}
                {/* sight glass: dark slot with the live oil column */}
                <mesh position={[t.x, (TANK.y0 + TANK.y1) / 2, TANK.z + GO_R + 0.004]} material={mats.knob}>
                  <boxGeometry args={[0.07, TANK.y1 - TANK.y0, 0.01]} />
                </mesh>
                <mesh
                  ref={(m) => {
                    levels.current[i] = m;
                  }}
                  position={[t.x, TANK.y0 + 0.2, TANK.z + GO_R + 0.012]}
                  material={mats.oil}
                >
                  <boxGeometry args={[0.05, 1, 0.01]} />
                </mesh>
              </group>
            ))}
            <mesh position={[TANK.x, TANK.y0 - 0.14, TANK.z]} material={mats.gasLine}>
              <cylinderGeometry args={[0.045, 0.045, 0.1, 6]} />
            </mesh>
          </Pick>
          {/* ---------- Flow-control valves on each tank's oil outlet ---------- */}
          <Pick id="flow-controls" {...pick}>
            {GO_TANKS.map((t) => (
              <group key={t.side} position={[t.x, TANK.y0 - 0.2, TANK.z + 0.12]}>
                <RoundedBox args={[0.14, 0.1, 0.12]} radius={0.015} smoothness={2} material={mats.pumpBody} />
                <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={mats.gaugeNeedle}>
                  <cylinderGeometry args={[0.03, 0.03, 0.05, 14]} />
                </mesh>
              </group>
            ))}
          </Pick>
        </>
      ) : (
      <>
      {/* ---------- Reserve gas tank behind a check valve ---------- */}
      <Pick id="gas-tank" {...pick}>
        <mesh position={[TANK.x, (TANK.y0 + TANK.y1) / 2, TANK.z]} material={mats.gasTank}>
          <cylinderGeometry args={[TANK.r, TANK.r, TANK.y1 - TANK.y0, 36]} />
        </mesh>
        {[TANK.y0, TANK.y1].map((y, i) => (
          <mesh key={y} position={[TANK.x, y, TANK.z]} scale={[1, 0.45, 1]} rotation={[i ? 0 : Math.PI, 0, 0]} material={mats.gasTank}>
            <sphereGeometry args={[TANK.r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        ))}
        {/* check valve on the inlet */}
        <mesh position={[TANK.x, TANK.y0 - 0.14, TANK.z]} material={mats.gasLine}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 6]} />
        </mesh>
      </Pick>
      </>
      )}

      {/* ---------- Line-break control, gauge and pipeline tap ---------- */}
      <Pick id="gas-controls" {...pick}>
        <RoundedBox args={[0.46, 0.5, 0.26]} radius={0.03} smoothness={3} position={[CONTROL.x, CONTROL.y, CONTROL.z]} material={mats.gasControl} />
        <group position={[CONTROL.x, CONTROL.y + 0.04, CONTROL.z + 0.135]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.bezel}>
            <cylinderGeometry args={[0.16, 0.16, 0.025, 36]} />
          </mesh>
          <mesh position={[0, 0, 0.014]} material={mats.gaugeFace}>
            <circleGeometry args={[0.14, 36]} />
          </mesh>
          <group ref={needle} position={[0, 0, 0.02]}>
            <mesh position={[0, 0.055, 0]} material={mats.gaugeNeedle}>
              <boxGeometry args={[0.012, 0.11, 0.004]} />
            </mesh>
          </group>
        </group>
        <mesh geometry={geo.tap} material={mats.gasLine} />
        <mesh geometry={geo.feed} material={mats.gasLine} />
        <mesh geometry={geo.sense} material={mats.gasLine} />
        {/* lever-operated poppet valves for local open / close on the control manifold */}
        {[-0.11, 0.11].map((dx, i) => (
          <group key={dx} position={[CONTROL.x + dx, CONTROL.y + 0.27, CONTROL.z + 0.02]}>
            <mesh material={mats.vaneFixings}>
              <boxGeometry args={[0.1, 0.05, 0.1]} />
            </mesh>
            <mesh position={[0, 0.07, 0.03]} rotation={[0.5, 0, i ? -0.25 : 0.25]} material={mats.gaugeNeedle}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            </mesh>
          </group>
        ))}
        {/* particulate filter on the supply tap (stainless bowl) */}
        <mesh position={[0.32, -1.32, TANK.z]} material={mats.vaneFixings}>
          <cylinderGeometry args={[0.055, 0.045, 0.18, 20]} />
        </mesh>
      </Pick>

      {showLabels && (
        <>
          {!overOil && <Label position={[OVERRIDE.x0 + len / 2, 0.42, Z - 0.3]}>Hydraulic override</Label>}
          {overOil ? <Label position={[2.62, -0.25, GAS_FRONT_Z + 0.06]}>Hand pumps: open and close</Label> : <Label position={[3.0, 1.05, Z]}>Hand pump</Label>}
          <Label position={[TANK.x, TANK.y1 + 0.42, TANK.z - 0.1]}>{overOil ? "Gas/oil tanks" : "Reserve gas tank"}</Label>
          <Label position={[CONTROL.x, CONTROL.y + 0.42, CONTROL.z]}>Line-break control</Label>
        </>
      )}
    </>
  );
}
