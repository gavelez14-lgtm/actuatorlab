"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  RP,
  RP_CAP_INNER_X,
  rpPinionRotationY,
  rpPistonCentreX,
  rpPistonInnerX,
  rpPistonOuterX,
  rpSpringLength,
} from "@/lib/sim/rackPinionGeometry";
import { HOUSING, SHAFT } from "@/lib/sim/geometry";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { HelixSpring } from "./helix";
import { SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick } from "./parts";
import { ValveAssembly } from "./ValveAssembly";
import { AirSystem, type AirLayout } from "./AirSystem";

/**
 * Twin-piston pneumatic rack and pinion on the shared ball valve.
 * Architecture: two opposed pistons in one bore, each with a rack on opposite
 * sides of a central pinion; spring cartridges between pistons and end caps;
 * axial stop bolts in the end caps. See rackPinionGeometry.ts for sources.
 */

const { body: B, piston: P, rack: R } = RP;
const PITCH = (2 * Math.PI * RP.pitchRadius) / RP.pinionTeeth;
const TOOTH = 0.03;

function buildBody() {
  const r = 0.09;
  const hw = B.halfZ;
  const hh = B.halfY;
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const bore = new THREE.Path();
  bore.absarc(0, 0, B.boreRadius, 0, Math.PI * 2, true);
  s.holes.push(bore);
  const g = new THREE.ExtrudeGeometry(s, { depth: B.halfX * 2, bevelEnabled: false, curveSegments: 40 });
  // shape (x,y) -> world (-z, y); extrusion -> world +x
  g.rotateY(Math.PI / 2);
  g.translate(-B.halfX, 0, 0);
  return g;
}

/** RH-style heavy-duty exterior (original proportions): centre housing, tube radius, flange half-size. */
const RH = { housingHalfX: 0.42, tubeR: RP.body.boreRadius + 0.035, flange: RP.body.boreRadius + 0.075 } as const;

/** Air layout: NAMUR-style solenoid block on the +Z face, ports either side. */
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FACE = B.halfZ;
const PORT_A = v(-0.3, 0.06, FACE + 0.03);
const PORT_B = v(0.3, 0.06, FACE + 0.03);
const BLOCK = v(0, 0.06, FACE + 0.14);
const RP_AIR: AirLayout = {
  curves: {
    toA: new THREE.CatmullRomCurve3([v(-0.2, 0.06, FACE + 0.14), v(-0.28, 0.08, FACE + 0.14), PORT_A.clone()]),
    toB: new THREE.CatmullRomCurve3([v(0.2, 0.06, FACE + 0.14), v(0.28, 0.08, FACE + 0.14), PORT_B.clone()]),
    supply: new THREE.CatmullRomCurve3([v(0, -0.05, FACE + 0.16), v(0, -0.32, FACE + 0.32), v(0.25, -0.62, FACE + 0.62)]),
    exhaust: new THREE.CatmullRomCurve3([v(0, 0.18, FACE + 0.2), v(0, 0.4, FACE + 0.32), v(0, 0.62, FACE + 0.42)]),
    breather: new THREE.CatmullRomCurve3([PORT_B.clone(), v(0.3, 0.06, FACE + 0.28), v(0.3, 0.06, FACE + 0.55)]),
  },
  chambers: (stroke) => {
    const inner = rpPistonInnerX(stroke);
    const outer = rpPistonOuterX(stroke);
    const r = B.boreRadius - 0.012;
    return {
      a: [{ x0: -inner, x1: inner, y: 0, z: 0, r }],
      b: [
        { x0: outer, x1: RP_CAP_INNER_X, y: 0, z: 0, r },
        { x0: -RP_CAP_INNER_X, x1: -outer, y: 0, z: 0, r },
      ],
    };
  },
  block: { position: BLOCK, size: [0.4, 0.2, 0.2] },
  portA: PORT_A,
  portB: PORT_B,
  portRotation: [Math.PI / 2, 0, 0],
  silencer: { position: v(0, 0.24, FACE + 0.14), rotation: [0, 0, 0] },
  supplyInlet: v(0.25, -0.62, FACE + 0.62),
  labels: { supply: v(0.25, -0.75, FACE + 0.62), exhaust: v(0, 0.78, FACE + 0.42), breather: v(0.3, 0.25, FACE + 0.55) },
};

/**
 * One piston with its rack, built for the +X side (rack at -Z). The -X piston
 * is the same assembly rotated 180° about Y, which puts its rack at +Z.
 * Rack teeth are phased so a tooth gap sits on the pinion contact line at
 * stroke 0; because rack travel = pitch radius x rotation, they stay in mesh.
 */
function PistonAssembly({ mats, pick }: { mats: MaterialSet; pick: { onSelect: (id: ComponentId) => void; onHover: (id: ComponentId | null) => void } }) {
  const c0 = rpPistonCentreX(0);
  const rackCentreX = -P.thickness / 2 - R.length / 2;
  const rackZ = -(RP.pitchRadius + TOOTH / 2 + R.depth / 2);
  const teeth = useMemo(() => {
    // world x at stroke 0 = (j + 0.5) * PITCH, so a gap sits on the contact line; local = world - c0
    const out: number[] = [];
    const lo = -P.thickness / 2 - R.length + PITCH * 0.3;
    const hi = -P.thickness / 2 - 0.01;
    for (let j = -20; j <= 20; j++) {
      const local = (j + 0.5) * PITCH - c0;
      if (local >= lo && local <= hi) out.push(local);
    }
    return out;
  }, [c0]);
  return (
    <>
      <Pick id="piston" {...pick}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={mats.piston}>
          <cylinderGeometry args={[P.radius, P.radius, P.thickness, 48]} />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.pistonSeal}>
            <cylinderGeometry args={[P.radius + 0.006, P.radius + 0.006, 0.022, 48]} />
          </mesh>
        ))}
      </Pick>
      <Pick id="rack" {...pick}>
        <mesh position={[rackCentreX, 0, rackZ]} material={mats.rack}>
          <boxGeometry args={[R.length, R.height, R.depth]} />
        </mesh>
        {teeth.map((x) => (
          <mesh key={x} position={[x, 0, -(RP.pitchRadius)]} material={mats.rack}>
            <boxGeometry args={[PITCH * 0.48, R.height, TOOTH]} />
          </mesh>
        ))}
      </Pick>
    </>
  );
}

export function RackPinionModel({
  mats,
  onSelect,
  onHover,
  rootRef,
}: {
  mats: MaterialSet;
  onSelect: (id: ComponentId) => void;
  onHover: (id: ComponentId | null) => void;
  rootRef?: React.RefObject<THREE.Group | null>;
}) {
  const { engine } = useEngine();
  const hydraulic = useSimSelector((s) => s.config.family === "hydraulic-rack-pinion");
  const actionType = useSimSelector((s) => s.config.actionType);
  const failPosition = useSimSelector((s) => s.config.failPosition);
  const cutaway = useSimSelector((s) => s.cutaway);
  const showLabels = useSimSelector((s) => s.showLabels);
  const mode = useSimSelector((s) => s.mode);
  const springReturn = actionType === "spring-return";
  const pick = { onSelect, onHover };

  const body = useMemo(() => buildBody(), []);
  const helix = useMemo(() => new HelixSpring(RP.spring.turns, RP.spring.coilRadius, RP.spring.wireRadius, 24, 6), []);
  useEffect(
    () => () => {
      body.dispose();
      helix.dispose();
    },
    [body, helix],
  );

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

  const pistonA = useRef<THREE.Group>(null);
  const pistonB = useRef<THREE.Group>(null);
  const pinion = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const couplingOffset = springReturn && failPosition === "fail-open" ? -Math.PI / 4 : Math.PI / 4;

  useFrame(() => {
    const s = engine.getState();
    const cx = rpPistonCentreX(s.stroke);
    const rot = rpPinionRotationY(s.stroke);
    if (pistonB.current) pistonB.current.position.x = cx;
    if (pistonA.current) pistonA.current.position.x = -cx;
    if (pinion.current) pinion.current.rotation.y = rot;
    if (ball.current) ball.current.rotation.y = rot + couplingOffset;
    if (springReturn) helix.setLength(rpSpringLength(s.stroke));
  });

  // pinion tooth phase: a tooth on each contact line (world angle pi and 0) at stroke 0
  const pinionTeeth = useMemo(() => {
    const out: number[] = [];
    const theta0 = Math.PI - rpPinionRotationY(0);
    for (let k = 0; k < RP.pinionTeeth; k++) out.push(theta0 + (k * 2 * Math.PI) / RP.pinionTeeth);
    return out;
  }, []);

  const capX = B.halfX + RP.endCapThickness / 2;
  const boltInsideStart = rpPistonOuterX(1);
  const boltEnd = B.halfX + RP.endCapThickness + 0.1;
  const springAngles = [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6];

  /** Fixed parts at one end: end cap, stop bolt, springs. Built for +X, mirrored for -X. */
  const endParts = () => (
    <>
      {hydraulic ? (
        <Pick id="end-caps" {...pick}>
          {/* RH-style: square steel end flange, tie rods back to the head flange on the centre housing */}
          <RoundedBox args={[RP.endCapThickness, RH.flange * 2, RH.flange * 2]} radius={0.02} smoothness={2} position={[capX, 0, 0]} material={mats.endCaps} raycast={shellRaycast} />
          <RoundedBox args={[0.08, RH.flange * 2, RH.flange * 2]} radius={0.02} smoothness={2} position={[RH.housingHalfX + 0.04, 0, 0]} material={mats.endCaps} raycast={shellRaycast} />
          {[
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ].map(([a, b2]) => (
            <mesh key={`tr${a}${b2}`} position={[(RH.housingHalfX + capX) / 2, a * (RH.flange - 0.05), b2 * (RH.flange - 0.05)]} rotation={[0, 0, Math.PI / 2]} material={mats.tieRods}>
              <cylinderGeometry args={[0.02, 0.02, capX - RH.housingHalfX + 0.12, 10]} />
            </mesh>
          ))}
          {/* stop bolt cap nut */}
          <mesh position={[B.halfX + RP.endCapThickness + 0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.tieRods}>
            <cylinderGeometry args={[0.048, 0.048, 0.08, 6]} />
          </mesh>
          <mesh position={[B.halfX + RP.endCapThickness + 0.13, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.tieRods}>
            <sphereGeometry args={[0.044, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </Pick>
      ) : (
      <Pick id="end-caps" {...pick}>
        {/* die-cast end cap: slightly proud of the extrusion, generously radiused */}
        <RoundedBox args={[RP.endCapThickness, B.halfY * 2 + 0.03, B.halfZ * 2 + 0.03]} radius={0.06} smoothness={4} position={[capX, 0, 0]} material={mats.rpEndCaps} raycast={shellRaycast} />
        <RoundedBox args={[0.03, B.halfY * 1.3, B.halfZ * 1.3]} radius={0.04} smoothness={3} position={[capX + RP.endCapThickness / 2, 0, 0]} material={mats.rpEndCaps} raycast={shellRaycast} />
        {[
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ].map(([a, b2]) => (
          <mesh key={`${a}${b2}`} position={[capX + 0.045, a * (B.halfY - 0.065), b2 * (B.halfZ - 0.065)]} rotation={[0, 0, Math.PI / 2]} material={mats.stainless}>
            <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
          </mesh>
        ))}
      </Pick>
      )}
      <Pick id="travel-stops" {...pick}>
        <mesh position={[(boltInsideStart + boltEnd) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.stainless}>
          <cylinderGeometry args={[RP.stopBolt.radius, RP.stopBolt.radius, boltEnd - boltInsideStart, 16]} />
        </mesh>
        <mesh position={[B.halfX + RP.endCapThickness + 0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.stainless}>
          <cylinderGeometry args={[0.055, 0.055, 0.04, 6]} />
        </mesh>
      </Pick>
      {springReturn && (
        <Pick id="spring" {...pick}>
          {springAngles.map((a) => (
            <mesh key={a} geometry={helix.geometry} position={[RP_CAP_INNER_X, RP.spring.ringRadius * Math.cos(a), RP.spring.ringRadius * Math.sin(a)]} material={mats.spring} />
          ))}
        </Pick>
      )}
    </>
  );

  return (
    <group ref={rootRef}>
      {/* Body */}
      {hydraulic ? (
        <Pick id="housing" {...pick}>
          {/* RH-style cast centre housing with ENP hydraulic cylinders bolted either side */}
          <RoundedBox args={[RH.housingHalfX * 2, B.halfY * 2 + 0.1, B.halfZ * 2 + 0.12]} radius={0.06} smoothness={3} material={mats.housing} raycast={shellRaycast} />
          <mesh position={[0, B.halfY + 0.06, 0]} material={mats.housingTrim} raycast={shellRaycast}>
            <cylinderGeometry args={[0.22, 0.24, 0.06, 40]} />
          </mesh>
          <mesh position={[0, -B.halfY - 0.06, 0]} material={mats.housingTrim} raycast={shellRaycast}>
            <cylinderGeometry args={[0.24, 0.22, 0.06, 40]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (RH.housingHalfX + 0.08 + (B.halfX - RH.housingHalfX - 0.08) / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.cylinder} raycast={shellRaycast}>
              <cylinderGeometry args={[RH.tubeR, RH.tubeR, B.halfX - RH.housingHalfX - 0.08, 48, 1, true]} />
            </mesh>
          ))}
          <mesh position={[-0.12, -0.02, B.halfZ + 0.064]} material={mats.nameplate} raycast={shellRaycast}>
            <boxGeometry args={[0.32, 0.16, 0.006]} />
          </mesh>
        </Pick>
      ) : (
      <Pick id="housing" {...pick}>
        <mesh geometry={body} material={mats.rpBody} raycast={shellRaycast} />
        {/* extrusion channels running the length of the anodised body */}
        {[-1, 1].flatMap((sy) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sy}${sz}`} position={[0, sy * (B.halfY + 0.0015), sz * (B.halfZ - 0.12)]} material={mats.knob} raycast={shellRaycast}>
              <boxGeometry args={[B.halfX * 2 - 0.02, 0.004, 0.022]} />
            </mesh>
          )),
        )}
        {[-1, 1].map((sz) => (
          <mesh key={`side${sz}`} position={[0, B.halfY - 0.07, sz * (B.halfZ + 0.0015)]} material={mats.knob} raycast={shellRaycast}>
            <boxGeometry args={[B.halfX * 2 - 0.02, 0.018, 0.004]} />
          </mesh>
        ))}
        {/* blank nameplate (no maker's mark) on the rear face */}
        <mesh position={[0.35, -0.04, -(B.halfZ + 0.004)]} material={mats.nameplate} raycast={shellRaycast}>
          <boxGeometry args={[0.36, 0.16, 0.006]} />
        </mesh>
        {/* top boss for the pinion and accessory interface */}
        <mesh position={[0, B.halfY + 0.03, 0]} material={mats.rpBody} raycast={shellRaycast}>
          <cylinderGeometry args={[0.2, 0.22, 0.06, 40]} />
        </mesh>
        <mesh position={[0, -B.halfY - 0.03, 0]} material={mats.rpBody} raycast={shellRaycast}>
          <cylinderGeometry args={[0.22, 0.2, 0.06, 40]} />
        </mesh>
      </Pick>
      )}

      <group>{endParts()}</group>
      <group rotation={[0, Math.PI, 0]}>{endParts()}</group>

      {/* Moving pistons and racks */}
      <group ref={pistonB} position={[rpPistonCentreX(0), 0, 0]}>
        <PistonAssembly mats={mats} pick={pick} />
        {showLabels && <Label position={[0, 0.42, 0]}>Piston and rack: linear</Label>}
      </group>
      <group ref={pistonA} position={[-rpPistonCentreX(0), 0, 0]} rotation={[0, Math.PI, 0]}>
        <PistonAssembly mats={mats} pick={pick} />
      </group>

      {/* Pinion, shaft, retaining ring and indicator rotate together */}
      <group ref={pinion} rotation={[0, rpPinionRotationY(0), 0]}>
        <Pick id="pinion" {...pick}>
          <mesh material={mats.pinion}>
            <cylinderGeometry args={[RP.pitchRadius - TOOTH / 2, RP.pitchRadius - TOOTH / 2, RP.pinionHeight, 40]} />
          </mesh>
          {pinionTeeth.map((t) => (
            <mesh key={t} position={[RP.pitchRadius * Math.sin(t), 0, RP.pitchRadius * Math.cos(t)]} rotation={[0, t, 0]} material={mats.pinion}>
              <boxGeometry args={[PITCH * 0.46, RP.pinionHeight, TOOTH]} />
            </mesh>
          ))}
        </Pick>
        <Pick id="output-shaft" {...pick}>
          <mesh position={[0, (SHAFT.top - 0.8) / 2, 0]} material={mats.shaft}>
            <cylinderGeometry args={[0.075, 0.075, SHAFT.top + 0.8, 24]} />
          </mesh>
          {/* anti-blowout retaining ring above the top bearing */}
          <mesh position={[0, B.halfY + 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.tieRods}>
            <torusGeometry args={[0.085, 0.012, 8, 32]} />
          </mesh>
          <mesh position={[0, -0.68, 0]} material={mats.stem}>
            <cylinderGeometry args={[0.13, 0.13, 0.24, 6]} />
          </mesh>
          {hydraulic ? (
            <group position={[0, HOUSING.halfY + 0.13, 0]} rotation={[0, couplingOffset, 0]}>
              <mesh material={mats.indicator}>
                <cylinderGeometry args={[0.2, 0.2, 0.06, 40]} />
              </mesh>
              <mesh position={[0, 0.035, 0]} material={mats.indicatorStripe}>
                <boxGeometry args={[0.045, 0.012, 0.36]} />
              </mesh>
            </group>
          ) : (
            // Yellow dome indicator: a black band across the dome lines up with the valve bore.
            <group position={[0, HOUSING.halfY + 0.1, 0]} rotation={[0, couplingOffset, 0]}>
              <mesh material={mats.domeBlack}>
                <cylinderGeometry args={[0.17, 0.19, 0.05, 40]} />
              </mesh>
              <mesh position={[0, 0.025, 0]} scale={[1, 0.62, 1]} material={mats.domeYellow}>
                <sphereGeometry args={[0.17, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              <mesh position={[0, 0.03, 0]} scale={[1, 0.64, 1]} material={mats.domeBlack}>
                <sphereGeometry args={[0.172, 32, 16, Math.PI / 2 - 0.12, 0.24, 0, Math.PI / 2]} />
              </mesh>
              <mesh position={[0, 0.03, 0]} scale={[1, 0.64, 1]} material={mats.domeBlack}>
                <sphereGeometry args={[0.172, 32, 16, (3 * Math.PI) / 2 - 0.12, 0.24, 0, Math.PI / 2]} />
              </mesh>
            </group>
          )}
        </Pick>
        {showLabels && <Label position={[0.0, 0.3, 0.32]}>Pinion: rotary output</Label>}
      </group>
      {showLabels && <Label position={[0, 0.95, 0]}>Racks move apart, pinion turns 90°</Label>}

      <ValveAssembly mats={mats} pick={pick} ballRef={ball} ballRotation={rpPinionRotationY(0) + couplingOffset} cutaway={cutaway} showLabels={showLabels} />
      <AirSystem mats={mats} springReturn={springReturn} active={mode === "energy"} layout={RP_AIR} oil={hydraulic} />
    </group>
  );
}
