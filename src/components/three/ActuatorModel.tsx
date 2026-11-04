"use client";

import { isGas, isGasOverOil } from "@/lib/sim/gas";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line, RoundedBox } from "@react-three/drei";
import {
  CYLINDER,
  GUIDE_BAR,
  GUIDE_BLOCK,
  HOUSING,
  PIN,
  PISTON,
  SHAFT,
  SPRING_MODULE,
  YOKE,
  YOKE_OFFSET,
  pinXFromStroke,
  shaftRotationY,
  springLengthFromStroke,
  yokeKinematics,
  type YokeKinematics,
} from "@/lib/sim/geometry";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { HelixSpring } from "./helix";
import { SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick } from "./parts";
import { ValveAssembly } from "./ValveAssembly";
import { AirSystem } from "./AirSystem";
import { GasSystem, OverrideSliderParts } from "./GasSystem";
import { ElectroHydraulicModule } from "./ElectroHydraulicModule";

const AXIS_Z = -YOKE_OFFSET;

/** Bolted top cover of the centre body and its bolt pattern (original layout). */
const COVER = { z: (HOUSING.zFront + HOUSING.zBack) / 2, depth: HOUSING.zFront - HOUSING.zBack - 0.14 };
const coverBolts: [number, number][] = (() => {
  const out: [number, number][] = [];
  const hx = HOUSING.halfX - 0.12;
  const z0 = COVER.z - COVER.depth / 2 + 0.05;
  const z1 = COVER.z + COVER.depth / 2 - 0.05;
  for (let i = 0; i <= 5; i++) {
    const x = -hx + (i * 2 * hx) / 5;
    out.push([x, z0], [x, z1]);
  }
  for (let i = 1; i < 4; i++) {
    const z = z0 + (i * (z1 - z0)) / 4;
    out.push([-hx, z], [hx, z]);
  }
  // keep clear of the indicator boss over the shaft
  return out.filter(([x, z]) => Math.hypot(x, z) > 0.36);
})();

/* ---------- geometry builders (run once) ---------- */

function roundedRect(shape: THREE.Shape | THREE.Path, x0: number, y0: number, x1: number, y1: number, r: number) {
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);
}

function buildHousing() {
  const bevel = 0.035;
  const s = new THREE.Shape();
  // Shape coordinates are (x, -z); see geometry notes.
  roundedRect(s, -HOUSING.halfX + bevel, -HOUSING.zFront + bevel, HOUSING.halfX - bevel, -HOUSING.zBack - bevel, 0.16);
  const depth = HOUSING.halfY * 2 - bevel * 2;
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth / 2, 0);
  return g;
}

function buildYokePlate() {
  const s = new THREE.Shape();
  const hub = 0.2;
  const tipR = 0.17;
  const tipY = YOKE.plateLength - tipR;
  s.moveTo(hub, 0);
  s.lineTo(tipR, tipY);
  s.absarc(0, tipY, tipR, 0, Math.PI, false);
  s.lineTo(-hub, 0);
  s.absarc(0, 0, hub, Math.PI, Math.PI * 2, false);
  const w = YOKE.slotWidth / 2;
  const a = YOKE.slotStart + w;
  const b = YOKE.slotEnd - w;
  const slot = new THREE.Path();
  slot.moveTo(w, a);
  slot.absarc(0, a, w, 0, -Math.PI, true);
  slot.lineTo(-w, b);
  slot.absarc(0, b, w, Math.PI, 0, true);
  slot.lineTo(w, a);
  s.holes.push(slot);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: YOKE.plateThickness,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 16,
  });
  // Shape +Y (radial) -> world -Z, extrusion -> world +Y.
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Lathe a rectangular ring profile around Y, then lay it along +X. */
function buildTubeAlongX(inner: number, outer: number, length: number, segments = 48) {
  const pts = [
    new THREE.Vector2(inner, 0),
    new THREE.Vector2(outer, 0),
    new THREE.Vector2(outer, length),
    new THREE.Vector2(inner, length),
    new THREE.Vector2(inner, 0),
  ];
  const g = new THREE.LatheGeometry(pts, segments);
  g.rotateZ(-Math.PI / 2);
  return g;
}


/* ---------- model ---------- */

export interface ActuatorModelProps {
  mats: MaterialSet;
  onSelect: (id: ComponentId) => void;
  onHover: (id: ComponentId | null) => void;
  rootRef?: React.RefObject<THREE.Group | null>;
}

export function ActuatorModel({ mats, onSelect, onHover, rootRef }: ActuatorModelProps) {
  const { engine } = useEngine();
  const actionType = useSimSelector((s) => s.config.actionType);
  const failPosition = useSimSelector((s) => s.config.failPosition);
  const cutaway = useSimSelector((s) => s.cutaway);
  const showLabels = useSimSelector((s) => s.showLabels);
  const mode = useSimSelector((s) => s.mode);
  const springReturn = actionType === "spring-return";
  const gas = useSimSelector((s) => isGas(s.config.family));
  const yoke = useSimSelector((s) => s.config.yoke);
  // Canted yoke: offset swing, centring shift on piston and spring, compensated coupling.
  const k = useMemo(() => yokeKinematics({ yoke, actionType, failPosition }), [yoke, actionType, failPosition]);
  const sh = k.shift;
  const overOil = useSimSelector((s) => isGasOverOil(s.config.family));
  const eh = useSimSelector((s) => s.config.family === "electro-hydraulic");
  const hydraulic = useSimSelector((s) => s.config.family === "hydraulic-scotch-yoke");

  const geo = useMemo(
    () => ({
      housing: buildHousing(),
      yokePlate: buildYokePlate(),
      cylTube: buildTubeAlongX(CYLINDER.boreRadius, CYLINDER.outerRadius, CYLINDER.tubeEnd - CYLINDER.tubeStart),
      canister: buildTubeAlongX(
        SPRING_MODULE.radius - 0.04,
        SPRING_MODULE.radius,
        SPRING_MODULE.canisterStart - SPRING_MODULE.canisterEnd,
      ),
    }),
    [],
  );
  const helix = useMemo(
    () => new HelixSpring(SPRING_MODULE.turns, SPRING_MODULE.coilMeanRadius, SPRING_MODULE.wireRadius),
    [],
  );
  useEffect(
    () => () => {
      helix.dispose();
      geo.housing.dispose();
      geo.yokePlate.dispose();
      geo.cylTube.dispose();
      geo.canister.dispose();
    },
    [geo, helix],
  );

  // Shell raycasting honours the current cutaway so clicks reach inner parts.
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

  const slider = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);

  // Coupling orientation: which actuator stroke end corresponds to valve open.
  const couplingOffset = springReturn && failPosition === "fail-open" ? -Math.PI / 4 : Math.PI / 4;

  useFrame(() => {
    const s = engine.getState();
    const x = pinXFromStroke(s.stroke, k);
    const rot = shaftRotationY(s.stroke, k);
    if (slider.current) slider.current.position.x = x;
    if (shaft.current) shaft.current.rotation.y = rot;
    // The valve sees the uncanted 0..90 deg: the coupling is keyed to cancel the cant.
    if (ball.current) ball.current.rotation.y = shaftRotationY(s.stroke) + couplingOffset;
    if (springReturn) helix.setLength(springLengthFromStroke(s.stroke, k));
  });

  const pick = { onSelect, onHover };
  const capSize = 0.86;
  const tieOff = 0.34;
  const cylMid = (CYLINDER.innerCapStart + CYLINDER.tubeEnd + CYLINDER.outerCapThickness) / 2;
  const cylSpan = CYLINDER.tubeEnd + CYLINDER.outerCapThickness - CYLINDER.innerCapStart;
  const rodStart = GUIDE_BLOCK.sizeX / 2;
  const rodEnd = PISTON.rodLength - PISTON.thickness / 2;
  const springRodStart = -GUIDE_BLOCK.sizeX / 2;
  const springRodEnd = -SPRING_MODULE.rodLength;
  const bodyGap = YOKE.plateY - YOKE.plateThickness / 2;

  return (
    <group ref={rootRef}>
      {/* ---------------- Yoke housing (static) ---------------- */}
      <Pick id="housing" {...pick}>
        <mesh geometry={geo.housing} material={mats.housing} raycast={shellRaycast} />
        <mesh position={[0, HOUSING.halfY + 0.04, 0]} material={mats.housingTrim} raycast={shellRaycast}>
          <cylinderGeometry args={[0.27, 0.29, 0.08, 40]} />
        </mesh>
        <mesh position={[0, -HOUSING.halfY - 0.03, 0]} material={mats.housingTrim} raycast={shellRaycast}>
          <cylinderGeometry args={[0.29, 0.27, 0.06, 40]} />
        </mesh>
        {/* bolted top cover of the fabricated centre body */}
        <RoundedBox args={[HOUSING.halfX * 2 - 0.14, 0.022, COVER.depth]} radius={0.01} smoothness={2} position={[0, HOUSING.halfY + 0.011, COVER.z]} material={mats.housing} raycast={shellRaycast} />
        {coverBolts.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, HOUSING.halfY + 0.03, z]} material={mats.housingTrim} raycast={shellRaycast}>
            <cylinderGeometry args={[0.022, 0.022, 0.018, 6]} />
          </mesh>
        ))}
        {/* blank nameplate (no maker's mark) on the front face */}
        <mesh position={[-0.45, 0, HOUSING.zFront + 0.004]} material={mats.nameplate} raycast={shellRaycast}>
          <boxGeometry args={[0.42, 0.2, 0.006]} />
        </mesh>
        {/* pressure relief valve on the underside of the centre body */}
        <mesh position={[0.62, -HOUSING.halfY - 0.035, -0.82]} material={mats.tieRods} raycast={shellRaycast}>
          <cylinderGeometry args={[0.032, 0.032, 0.07, 6]} />
        </mesh>
        {!springReturn && (
          <mesh position={[-HOUSING.halfX - 0.03, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.housingTrim} raycast={shellRaycast}>
            <cylinderGeometry args={[0.24, 0.24, 0.06, 36]} />
          </mesh>
        )}
      </Pick>

      {/* ---------------- Guide bar (static) ---------------- */}
      <Pick id="guide-bar" {...pick}>
        <mesh position={[0, 0, GUIDE_BAR.z]} rotation={[0, 0, Math.PI / 2]} material={mats.guideBar}>
          <cylinderGeometry args={[GUIDE_BAR.radius, GUIDE_BAR.radius, HOUSING.halfX * 2 - 0.12, 20]} />
        </mesh>
        {[-1, 1].map((sgn) => (
          <mesh key={sgn} position={[sgn * (HOUSING.halfX - 0.1), 0, GUIDE_BAR.z - 0.08]} material={mats.block}>
            <boxGeometry args={[0.08, 0.16, 0.3]} />
          </mesh>
        ))}
      </Pick>

      {/* ---------------- Pneumatic cylinder (static) ---------------- */}
      <Pick id="cylinder" {...pick}>
        <mesh geometry={geo.cylTube} position={[CYLINDER.tubeStart, 0, AXIS_Z]} material={mats.cylinder} raycast={shellRaycast} />
      </Pick>
      <Pick id="end-caps" {...pick}>
        <RoundedBox
          args={[CYLINDER.innerCapThickness, capSize, capSize]}
          radius={0.03}
          smoothness={3}
          position={[CYLINDER.innerCapStart + CYLINDER.innerCapThickness / 2, 0, AXIS_Z]}
          material={mats.endCaps}
          raycast={shellRaycast}
        />
        <RoundedBox
          args={[CYLINDER.outerCapThickness, capSize, capSize]}
          radius={0.03}
          smoothness={3}
          position={[CYLINDER.tubeEnd + CYLINDER.outerCapThickness / 2, 0, AXIS_Z]}
          material={mats.endCaps}
          raycast={shellRaycast}
        />
        {/* lifting plates on the head and end flanges */}
        {[CYLINDER.innerCapStart + CYLINDER.innerCapThickness / 2, CYLINDER.tubeEnd + CYLINDER.outerCapThickness / 2].map((x) => (
          <group key={x} position={[x, capSize / 2 + 0.06, AXIS_Z]}>
            <mesh material={mats.endCaps} raycast={shellRaycast}>
              <boxGeometry args={[0.035, 0.12, 0.2]} />
            </mesh>
            <mesh position={[0, 0.015, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.knob}>
              <cylinderGeometry args={[0.032, 0.032, 0.04, 16]} />
            </mesh>
          </group>
        ))}
        {/* tie rods */}
        {[
          [tieOff, tieOff],
          [tieOff, -tieOff],
          [-tieOff, tieOff],
          [-tieOff, -tieOff],
        ].map(([y, z]) => (
          <mesh key={`${y}${z}`} position={[cylMid, y, AXIS_Z + z]} rotation={[0, 0, Math.PI / 2]} material={mats.tieRods}>
            <cylinderGeometry args={[0.022, 0.022, cylSpan + 0.08, 10]} />
          </mesh>
        ))}
        {/* travel stop screw + lock nut on outer cap (the override cylinder takes this place on gas units) */}
        {!(gas && !overOil) && <>
        <mesh position={[CYLINDER.tubeEnd + CYLINDER.outerCapThickness + 0.07, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.tieRods}>
          <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
        </mesh>
        <mesh position={[CYLINDER.tubeEnd + CYLINDER.outerCapThickness + 0.03, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.endCaps}>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 6]} />
        </mesh>
        {/* cap nut sealing the stop bolt */}
        <mesh position={[CYLINDER.tubeEnd + CYLINDER.outerCapThickness + 0.12, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.tieRods}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 6]} />
        </mesh>
        <mesh position={[CYLINDER.tubeEnd + CYLINDER.outerCapThickness + 0.17, 0, AXIS_Z]} rotation={[0, 0, -Math.PI / 2]} material={mats.tieRods}>
          <sphereGeometry args={[0.045, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        </>}
      </Pick>

      {/* ---------------- Spring module (static parts) ---------------- */}
      {springReturn && (
        <Pick id="spring" {...pick}>
          <mesh position={[SPRING_MODULE.adaptorStart - SPRING_MODULE.adaptorThickness / 2, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.canister} raycast={shellRaycast}>
            <cylinderGeometry args={[SPRING_MODULE.radius + 0.05, SPRING_MODULE.radius + 0.05, SPRING_MODULE.adaptorThickness, 40]} />
          </mesh>
          <mesh geometry={geo.canister} position={[SPRING_MODULE.canisterEnd, 0, AXIS_Z]} material={mats.canister} raycast={shellRaycast} />
          <mesh position={[SPRING_MODULE.canisterEnd - SPRING_MODULE.capThickness / 2, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.canister} raycast={shellRaycast}>
            <cylinderGeometry args={[SPRING_MODULE.radius + 0.04, SPRING_MODULE.radius + 0.04, SPRING_MODULE.capThickness, 40]} />
          </mesh>
          {/* spring-end travel stop */}
          <mesh position={[SPRING_MODULE.canisterEnd - SPRING_MODULE.capThickness - 0.07, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.tieRods}>
            <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
          </mesh>
          {/* welded canister: weld beads at both heads and a lifting lug */}
          {[SPRING_MODULE.canisterStart - 0.03, SPRING_MODULE.canisterEnd + 0.03].map((x) => (
            <mesh key={x} position={[x, 0, AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.canister} raycast={shellRaycast}>
              <torusGeometry args={[SPRING_MODULE.radius + 0.004, 0.012, 8, 48]} />
            </mesh>
          ))}
          <group position={[(SPRING_MODULE.canisterStart + SPRING_MODULE.canisterEnd) / 2, SPRING_MODULE.radius + 0.05, AXIS_Z]}>
            <mesh material={mats.canister} raycast={shellRaycast}>
              <boxGeometry args={[0.2, 0.1, 0.035]} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.knob}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 16]} />
            </mesh>
          </group>
          {/* the coil itself, anchored on the seat at the housing side */}
          <mesh geometry={helix.geometry} position={[SPRING_MODULE.canisterStart, 0, AXIS_Z]} material={mats.spring} />
        </Pick>
      )}

      {/* ---------------- Linear slider: everything that translates with the pin ---------------- */}
      <group ref={slider} position={[pinXFromStroke(0, k), 0, AXIS_Z]}>
        <Pick id="connecting-mechanism" {...pick}>
          <mesh material={mats.block}>
            <boxGeometry args={[GUIDE_BLOCK.sizeX, GUIDE_BLOCK.sizeY, GUIDE_BLOCK.sizeZ]} />
          </mesh>
          {/* slide shoe connecting block to the guide bar */}
          <mesh position={[0, 0, -0.15]} material={mats.block}>
            <boxGeometry args={[0.2, 0.08, 0.07]} />
          </mesh>
          <mesh position={[0, 0, GUIDE_BAR.z - AXIS_Z]} rotation={[0, 0, Math.PI / 2]} material={mats.block}>
            <cylinderGeometry args={[0.075, 0.075, 0.26, 20]} />
          </mesh>
          {/* piston rod */}
          <mesh position={[(rodStart + rodEnd + sh) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.rod}>
            <cylinderGeometry args={[PISTON.rodRadius, PISTON.rodRadius, rodEnd + sh - rodStart, 20]} />
          </mesh>
          {springReturn && (
            <mesh position={[(springRodStart + springRodEnd + sh) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.rod}>
              <cylinderGeometry args={[0.05, 0.05, springRodStart - springRodEnd - sh, 18]} />
            </mesh>
          )}
        </Pick>

        <Pick id="piston" {...pick}>
          <mesh position={[PISTON.rodLength + sh, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.piston}>
            <cylinderGeometry args={[PISTON.radius, PISTON.radius, PISTON.thickness, 40]} />
          </mesh>
          <mesh position={[PISTON.rodLength + sh, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.pistonSeal}>
            <cylinderGeometry args={[PISTON.radius + 0.006, PISTON.radius + 0.006, 0.03, 40]} />
          </mesh>
        </Pick>

        <Pick id="pin" {...pick}>
          <mesh material={mats.pin}>
            <cylinderGeometry args={[PIN.radius, PIN.radius, PIN.height, 20]} />
          </mesh>
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} position={[0, sgn * (PIN.height / 2 + 0.01), 0]} material={mats.pin}>
              <cylinderGeometry args={[0.062, 0.062, 0.03, 20]} />
            </mesh>
          ))}
        </Pick>

        {springReturn && (
          <Pick id="spring" {...pick}>
            <mesh position={[springRodEnd + sh, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.springPlate}>
              <cylinderGeometry args={[SPRING_MODULE.plateRadius, SPRING_MODULE.plateRadius, SPRING_MODULE.plateThickness, 40]} />
            </mesh>
          </Pick>
        )}

        {gas && !overOil && <OverrideSliderParts mats={mats} pick={pick} shift={sh} />}

        {showLabels && (
          <>
            <Label position={[PISTON.rodLength + sh, 0.62, 0]}>Piston: linear stroke</Label>
            <Label position={[0, 0.5, 0.05]}>Pin slides in yoke slot</Label>
          </>
        )}
      </group>

      {/* ---------------- Rotating output: yoke + shaft + coupling + indicator ---------------- */}
      <group ref={shaft} rotation={[0, shaftRotationY(0, k), 0]}>
        <Pick id="yoke" {...pick}>
          <mesh material={mats.yoke}>
            <cylinderGeometry args={[YOKE.hubRadius, YOKE.hubRadius, YOKE.hubHeight, 32]} />
          </mesh>
          <mesh geometry={geo.yokePlate} position={[0, bodyGap, 0]} material={mats.yoke} />
          <mesh geometry={geo.yokePlate} position={[0, -bodyGap - YOKE.plateThickness, 0]} material={mats.yoke} />
        </Pick>
        <Pick id="output-shaft" {...pick}>
          <mesh position={[0, (SHAFT.top + SHAFT.bottom) / 2 + 0.06, 0]} material={mats.shaft}>
            <cylinderGeometry args={[SHAFT.radius, SHAFT.radius, SHAFT.top - SHAFT.bottom - 0.12, 24]} />
          </mesh>
          {/* coupling (keyed to shaft, receives valve stem) */}
          <mesh position={[0, -0.68, 0]} material={mats.stem}>
            <cylinderGeometry args={[0.13, 0.13, 0.24, 6]} />
          </mesh>
          {/* position indicator: stripe aligns with the ball bore */}
          <group position={[0, HOUSING.halfY + 0.12, 0]} rotation={[0, couplingOffset + k.cant, 0]}>
            <mesh material={mats.indicator}>
              <cylinderGeometry args={[0.23, 0.23, 0.07, 40]} />
            </mesh>
            <mesh position={[0, 0.04, 0]} material={mats.indicatorStripe}>
              <boxGeometry args={[0.05, 0.012, 0.4]} />
            </mesh>
            <mesh position={[0, 0.04, -0.18]} rotation={[-Math.PI / 2, 0, 0]} material={mats.indicatorStripe}>
              <coneGeometry args={[0.05, 0.08, 3]} />
            </mesh>
          </group>
        </Pick>
        {showLabels && <Label position={[0, 0.3, -0.95]}>Yoke: rotary output</Label>}
      </group>
      {showLabels && <Label position={[0, 0.82, 0]}>Output shaft: 90° turn</Label>}

      {/* mechanical-mode guides: pin travel line and yoke swing arc */}
      {showLabels && <MotionGuides k={k} />}

      <ValveAssembly mats={mats} pick={pick} ballRef={ball} ballRotation={shaftRotationY(0) + couplingOffset} cutaway={cutaway} showLabels={showLabels} />

      <AirSystem mats={mats} springReturn={springReturn} active={mode === "energy"} oil={overOil || eh || hydraulic} />
      {eh && <ElectroHydraulicModule mats={mats} pick={pick} showLabels={showLabels} />}
      {gas && <GasSystem mats={mats} pick={pick} showLabels={showLabels} shellRaycast={shellRaycast} overOil={overOil} />}
    </group>
  );
}

/** Dashed pin travel line and the yoke's 90-degree swing arc. */
function MotionGuides({ k }: { k: YokeKinematics }) {
  const arc = useMemo(() => {
    const pts: [number, number, number][] = [];
    const r = YOKE.plateLength + 0.06;
    for (let i = 0; i <= 40; i++) {
      const psi = -Math.PI / 4 + k.cant + (i / 40) * (Math.PI / 2);
      pts.push([r * Math.sin(psi), 0.24, -r * Math.cos(psi)]);
    }
    return pts;
  }, [k]);
  return (
    <>
      <Line points={[[pinXFromStroke(0, k), 0.24, AXIS_Z], [pinXFromStroke(1, k), 0.24, AXIS_Z]]} color="#E8641B" lineWidth={1.5} dashed dashSize={0.05} gapSize={0.035} />
      <Line points={arc} color="#8FC7EA" lineWidth={1.5} />
    </>
  );
}
