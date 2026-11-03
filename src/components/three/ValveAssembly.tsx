"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BRACKET, VALVE } from "@/lib/sim/geometry";
import type { CutawayStyle } from "@/lib/sim/types";
import { SECTION_PLANE, VALVE_SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick, type PickHandlers } from "./parts";
import { useSimSelector } from "@/components/sim/SimulationProvider";

/** Butterfly wafer proportions (original, illustrative). */
const WAFER = { halfLength: 0.13, outerR: 0.42, discR: VALVE.pipeRadius - 0.008, discT: 0.045 } as const;

/**
 * Mounting bracket, coupling interface and sectioned quarter-turn ball valve.
 * Shared by every quarter-turn mechanism: the actuator only has to rotate
 * \`ballRef\` by its output-shaft angle plus the coupling offset.
 */

function buildValveBody() {
  const p = [
    [0.27, -0.62],
    [0.36, -0.52],
    [0.48, -0.26],
    [0.52, 0],
    [0.48, 0.26],
    [0.36, 0.52],
    [0.27, 0.62],
    [0.23, 0.62],
    [0.23, 0.44],
    [0.395, 0.26],
    [0.405, 0],
    [0.395, -0.26],
    [0.23, -0.44],
    [0.23, -0.62],
    [0.27, -0.62],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(p, 56);
  g.rotateX(Math.PI / 2); // axis Y -> Z (pipe axis)
  return g;
}

function buildBall() {
  const R = VALVE.ballRadius;
  const rb = VALVE.boreRadius;
  const h = Math.sqrt(R * R - rb * rb);
  const a0 = Math.asin(h / R);
  const pts: THREE.Vector2[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = a0 - (i / n) * 2 * a0; // from +h to -h through the equator
    pts.push(new THREE.Vector2(R * Math.cos(a), R * Math.sin(a)));
  }
  const outer = new THREE.LatheGeometry(pts, 48);
  outer.rotateX(Math.PI / 2); // bore axis Y -> Z
  const bore = new THREE.CylinderGeometry(rb, rb, 2 * h, 40, 1, true);
  bore.rotateX(Math.PI / 2);
  return { outer, bore, h };
}

export function ValveAssembly({
  mats,
  pick,
  ballRef,
  ballRotation,
  cutaway,
  showLabels,
}: {
  mats: MaterialSet;
  pick: PickHandlers;
  ballRef: React.RefObject<THREE.Group | null>;
  ballRotation: number;
  cutaway: CutawayStyle;
  showLabels: boolean;
}) {
  const geo = useMemo(() => ({ valveBody: buildValveBody(), ball: buildBall() }), []);
  useEffect(
    () => () => {
      geo.valveBody.dispose();
      geo.ball.outer.dispose();
      geo.ball.bore.dispose();
    },
    [geo],
  );
  const butterfly = useSimSelector((s) => s.config.valve === "butterfly");
  const plug = useSimSelector((s) => s.config.valve === "plug");
  const cutRef = useRef<CutawayStyle>(cutaway);
  cutRef.current = cutaway;
  const valveRaycast = useMemo(
    () =>
      makeShellRaycast(
        () => (cutRef.current === "section" ? [VALVE_SECTION_PLANE, SECTION_PLANE] : [VALVE_SECTION_PLANE]),
        () => cutRef.current === "ghost",
      ),
    [],
  );

  return (
    <>
      {/* ---------------- Mounting bracket ---------------- */}
      <Pick id="bracket" {...pick}>
        <mesh position={[0, BRACKET.top - 0.03, 0]} material={mats.bracket}>
          <boxGeometry args={[BRACKET.halfX * 2, 0.06, BRACKET.halfZ * 2]} />
        </mesh>
        <mesh position={[0, BRACKET.bottom + 0.03, 0]} material={mats.bracket}>
          <boxGeometry args={[BRACKET.halfX * 2, 0.06, BRACKET.halfZ * 2]} />
        </mesh>
        {[-1, 1].map((sgn) => (
          <mesh key={sgn} position={[sgn * (BRACKET.halfX - 0.03), (BRACKET.top + BRACKET.bottom) / 2, 0]} material={mats.bracket}>
            <boxGeometry args={[0.06, BRACKET.top - BRACKET.bottom - 0.12, BRACKET.halfZ * 2]} />
          </mesh>
        ))}
      </Pick>

      {butterfly ? (
        <group position={[0, VALVE.centerY, 0]}>
          <Pick id="valve-body" {...pick}>
            {/* wafer body: short ring between the pipe flanges */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.valveBody} raycast={valveRaycast}>
              <cylinderGeometry args={[WAFER.outerR, WAFER.outerR, WAFER.halfLength * 2, 48, 1, true]} />
            </mesh>
            {/* liner (seat) */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.seat}>
              <cylinderGeometry args={[VALVE.pipeRadius, VALVE.pipeRadius, WAFER.halfLength * 2 - 0.02, 48, 1, true]} />
            </mesh>
            {[-1, 1].map((sgn) => (
              <mesh key={sgn} position={[0, 0, sgn * (WAFER.halfLength + 0.04)]} rotation={[Math.PI / 2, 0, 0]} material={mats.valveBody} raycast={valveRaycast}>
                <cylinderGeometry args={[VALVE.flangeRadius, VALVE.flangeRadius, 0.08, 40, 1, true]} />
              </mesh>
            ))}
            {/* neck up to the mounting pad */}
            <mesh position={[0, (WAFER.outerR + 0.6) / 2, 0]} material={mats.valveBody} raycast={valveRaycast}>
              <cylinderGeometry args={[0.1, 0.12, 0.6 - WAFER.outerR, 24, 1, true]} />
            </mesh>
            <mesh position={[0, 0.6, 0]} material={mats.valveBody} raycast={valveRaycast}>
              <cylinderGeometry args={[0.26, 0.26, 0.04, 28]} />
            </mesh>
            {[-1, 1].map((sgn) => (
              <mesh
                key={`pipe${sgn}`}
                position={[0, 0, sgn * (WAFER.halfLength + 0.08 + (VALVE.pipeHalfLength - WAFER.halfLength - 0.08) / 2)]}
                rotation={[Math.PI / 2, 0, 0]}
                material={mats.pipe}
                raycast={valveRaycast}
              >
                <cylinderGeometry args={[VALVE.pipeRadius, VALVE.pipeRadius, VALVE.pipeHalfLength - WAFER.halfLength - 0.08, 36, 1, true]} />
              </mesh>
            ))}
          </Pick>
          <group ref={ballRef} rotation={[0, ballRotation, 0]}>
            <Pick id="ball" {...pick}>
              {/* disc in the local YZ plane: edge-on to the flow when the ball bore would be open */}
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.ball}>
                <cylinderGeometry args={[WAFER.discR, WAFER.discR, WAFER.discT, 48]} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.bore}>
                <cylinderGeometry args={[0.07, 0.07, WAFER.discT + 0.03, 24]} />
              </mesh>
            </Pick>
            <Pick id="stem" {...pick}>
              <mesh position={[0, 0.27, 0]} material={mats.stem}>
                <cylinderGeometry args={[0.05, 0.05, 1.08, 16]} />
              </mesh>
            </Pick>
            {showLabels && <Label position={[0.0, -0.45, 0]}>Disc turns with the shaft</Label>}
          </group>
        </group>
      ) : (
      <group position={[0, VALVE.centerY, 0]}>
        <Pick id="valve-body" {...pick}>
          <mesh geometry={geo.valveBody} material={mats.valveBody} raycast={valveRaycast} />
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} position={[0, 0, sgn * (VALVE.bodyHalfLength + 0.04)]} rotation={[Math.PI / 2, 0, 0]} material={mats.valveBody} raycast={valveRaycast}>
              <cylinderGeometry args={[VALVE.flangeRadius, VALVE.flangeRadius, 0.08, 40, 1, true]} />
            </mesh>
          ))}
          {/* bonnet neck and mounting pad */}
          <mesh position={[0, 0.54, 0]} material={mats.valveBody} raycast={valveRaycast}>
            <cylinderGeometry args={[0.14, 0.17, 0.08, 28, 1, true]} />
          </mesh>
          <mesh position={[0, 0.6, 0]} material={mats.valveBody} raycast={valveRaycast}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 28]} />
          </mesh>
          {/* seats (ball valve only) */}
          {!plug && [-1, 1].map((sgn) => (
            <mesh key={`seat${sgn}`} position={[0, 0, sgn * 0.29]} material={mats.seat}>
              <torusGeometry args={[0.23, 0.026, 10, 40]} />
            </mesh>
          ))}
          {/* pipe stubs (flow passage) */}
          {[-1, 1].map((sgn) => (
            <mesh
              key={`pipe${sgn}`}
              position={[0, 0, sgn * (VALVE.bodyHalfLength + 0.08 + (VALVE.pipeHalfLength - VALVE.bodyHalfLength) / 2)]}
              rotation={[Math.PI / 2, 0, 0]}
              material={mats.pipe}
              raycast={valveRaycast}
            >
              <cylinderGeometry args={[VALVE.pipeRadius, VALVE.pipeRadius, VALVE.pipeHalfLength - VALVE.bodyHalfLength, 36, 1, true]} />
            </mesh>
          ))}
        </Pick>

        <group ref={ballRef} rotation={[0, ballRotation, 0]}>
          <Pick id="ball" {...pick}>
            {plug ? (
              <>
                {/* tapered plug; the dark box is the rectangular port running through it */}
                <mesh material={mats.ball}>
                  <cylinderGeometry args={[0.33, 0.25, 0.68, 48]} />
                </mesh>
                <mesh material={mats.bore}>
                  <boxGeometry args={[0.15, 0.3, 0.7]} />
                </mesh>
              </>
            ) : (
              <>
                <mesh geometry={geo.ball.outer} material={mats.ball} />
                <mesh geometry={geo.ball.bore} material={mats.bore} />
              </>
            )}
          </Pick>
          <Pick id="stem" {...pick}>
            <mesh position={[0, 0.55, 0]} material={mats.stem}>
              <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
            </mesh>
            {/* tang engaging the ball slot */}
            <mesh position={[0, VALVE.ballRadius - 0.02, 0]} material={mats.stem}>
              <boxGeometry args={[0.04, 0.08, 0.16]} />
            </mesh>
          </Pick>
          {showLabels && <Label position={[0.0, -0.55, 0]}>{plug ? "Plug turns with the shaft" : "Ball turns with the shaft"}</Label>}
        </group>
      </group>
      )}

    </>
  );
}
