"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MULTI_TURN } from "@/lib/sim/electric";
import { MT, MT_LEAD, MT_STEM_LENGTH, mtGateCentreY, mtOutputRotation, mtStemBottomY, mtWormRotation } from "@/lib/sim/multiTurnGeometry";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { SECTION_PLANE, VALVE_SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick } from "./parts";
import { ControlCover, HelixCurve } from "./ElectricPartTurnModel";

/**
 * Electric multi-turn actuator on a rising-stem wedge gate valve.
 * Drive path: motor -> worm -> full worm wheel on a hollow output -> drive
 * bush (stem nut) in the thrust base -> threaded, non-rotating stem -> gate.
 * See multiTurnGeometry.ts for sources. Proportions are original.
 */

const W = MT.worm;
const V = MT.valve;
const TOOTH = 0.026;
const WHEEL_PITCH = (2 * Math.PI * MT.wheel.pitchRadius) / MT.wheel.teeth;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FLOW_CURVES = {
  cable: new THREE.CatmullRomCurve3([v(1.45, -0.4, -1.0), v(1.1, 0.4, -0.75), v(0.62, 0.62, -0.42), v(0.27, 0.58, -0.33)]),
  internal: new THREE.CatmullRomCurve3([v(0.12, 0.55, -0.33), v(0.4, 0.45, -0.36), v(0.72, 0.36, W.z)]),
  worm: new THREE.CatmullRomCurve3([v(0.62, W.y + 0.1, W.z), v(0.3, W.y + 0.1, W.z), v(0.02, W.y + 0.1, W.z)]),
  output: new THREE.CatmullRomCurve3([v(0, W.y + 0.1, -0.27), v(0.14, W.y + 0.05, -0.05), v(0.16, -0.14, 0), v(0.1, -0.7, 0), v(0.1, -1.05, 0)]),
};
const FLOW_STREAMS: { curve: keyof typeof FLOW_CURVES; color: THREE.Color }[] = [
  { curve: "cable", color: new THREE.Color("#FFD60A") },
  { curve: "internal", color: new THREE.Color("#FFD60A") },
  { curve: "worm", color: new THREE.Color("#FF9F0A") },
  { curve: "output", color: new THREE.Color("#FF9F0A") },
];
const PER_STREAM = 7;

export function ElectricMultiTurnModel({
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
  const cutaway = useSimSelector((s) => s.cutaway);
  const showLabels = useSimSelector((s) => s.showLabels);
  const mode = useSimSelector((s) => s.mode);
  const selector = useSimSelector((s) => s.electric.selector);
  const handMode = useSimSelector((s) => s.electric.handMode);
  const motorDir = useSimSelector((s) => (s.electric.motorRunning ? (s.direction === "opening" ? 1 : -1) : 0));
  const reduced = usePrefersReducedMotion();
  const pick = { onSelect, onHover };

  const geo = useMemo(() => {
    const wormThread = new THREE.TubeGeometry(new HelixCurve(-W.threadLength / 2, W.threadLength, W.pitchRadius, W.threadLength / WHEEL_PITCH), 260, 0.013, 6, false);
    // stem thread (upper part of the stem, runs through the nut over the stroke)
    const threadLen = 1.0;
    const stemThread = new THREE.TubeGeometry(new HelixCurve(0, threadLen, MT.stem.radius, threadLen / MT_LEAD), 360, 0.008, 5, false);
    stemThread.rotateZ(Math.PI / 2); // helix along +Y
    const hollow = new THREE.LatheGeometry(
      [
        new THREE.Vector2(MT.hollowShaft.inner, 0),
        new THREE.Vector2(MT.hollowShaft.outer, 0),
        new THREE.Vector2(MT.hollowShaft.outer, MT.hollowShaft.top - MT.hollowShaft.bottom),
        new THREE.Vector2(MT.hollowShaft.inner, MT.hollowShaft.top - MT.hollowShaft.bottom),
        new THREE.Vector2(MT.hollowShaft.inner, 0),
      ],
      32,
    );
    const teeth = Array.from({ length: MT.wheel.teeth }, (_, k) => Math.PI + k * ((2 * Math.PI) / MT.wheel.teeth));
    const cable = new THREE.TubeGeometry(FLOW_CURVES.cable, 48, 0.03, 8, false);
    return { wormThread, stemThread, hollow, teeth, cable, threadLen };
  }, []);
  useEffect(
    () => () => {
      geo.wormThread.dispose();
      geo.stemThread.dispose();
      geo.hollow.dispose();
      geo.cable.dispose();
    },
    [geo],
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
  const valveRaycast = useMemo(
    () =>
      makeShellRaycast(
        () => (cutRef.current === "section" ? [VALVE_SECTION_PLANE, SECTION_PLANE] : [VALVE_SECTION_PLANE]),
        () => cutRef.current === "ghost",
      ),
    [],
  );

  const output = useRef<THREE.Group>(null);
  const worm = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const hand = useRef<THREE.Group>(null);
  const stem = useRef<THREE.Group>(null);
  const gate = useRef<THREE.Group>(null);
  const markers = useRef<THREE.InstancedMesh>(null);
  const motorAngle = useRef(0);
  const handAngle = useRef(0);
  const lastOut = useRef(0);
  const phase = useRef(0);
  const markerGeo = useMemo(() => new THREE.ConeGeometry(0.034, 0.095, 10).rotateX(Math.PI / 2), []);
  const markerMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(
    () => () => {
      markerGeo.dispose();
      markerMat.dispose();
    },
    [markerGeo, markerMat],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), t: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), f: new THREE.Vector3(0, 0, 1) }), []);

  useFrame((_, delta) => {
    const s = engine.getState();
    const out = mtOutputRotation(s.stroke);
    const dOut = out - lastOut.current;
    lastOut.current = out;
    if (s.electric.handMode) handAngle.current += dOut;
    else motorAngle.current += dOut * MULTI_TURN.wormRatio;
    if (output.current) output.current.rotation.y = out;
    if (worm.current) worm.current.rotation.x = mtWormRotation(s.stroke);
    if (rotor.current) rotor.current.rotation.x = motorAngle.current;
    if (hand.current) hand.current.rotation.y = handAngle.current;
    if (stem.current) stem.current.position.y = mtStemBottomY(s.stroke);
    if (gate.current) gate.current.position.y = mtGateCentreY(s.stroke);

    const im = markers.current;
    if (!im) return;
    if (mode !== "energy" || !s.electric.motorRunning) {
      im.count = 0;
      im.instanceMatrix.needsUpdate = true;
      return;
    }
    if (!reduced && s.playing) phase.current = (phase.current + delta * 0.6 * Math.max(0.4, s.speed)) % 1;
    let n = 0;
    for (const st of FLOW_STREAMS) {
      const curve = FLOW_CURVES[st.curve];
      for (let i = 0; i < PER_STREAM; i++) {
        const u = (phase.current + i / PER_STREAM) % 1;
        curve.getPointAt(u, tmp.p);
        curve.getTangentAt(u, tmp.t);
        tmp.q.setFromUnitVectors(tmp.f, tmp.t.normalize());
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        im.setMatrixAt(n, tmp.m);
        im.setColorAt(n, st.color);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  const [gx, gy, gz] = MT.gearcase.centre;
  const [sx, sy, sz] = MT.gearcase.size;
  const coverY = gy;
  const coverZ = gz + sz / 2;
  const selectorAngle = selector === "local" ? Math.PI / 4 : selector === "remote" ? -Math.PI / 4 : 0;
  const openCloseAngle = motorDir > 0 && selector === "local" ? -Math.PI / 4 : motorDir < 0 && selector === "local" ? Math.PI / 4 : 0;
  const bonnetFlangeY = V.cavityTop;

  return (
    <group ref={rootRef}>
      {/* ---------------- Actuator ---------------- */}
      <Pick id="housing" {...pick}>
        <RoundedBox args={[sx, sy, sz]} radius={0.08} smoothness={4} position={[gx, gy, gz]} material={mats.housing} raycast={shellRaycast} />
      </Pick>

      <ControlCover mats={mats} pick={pick} y={coverY} z={coverZ} selectorAngle={selectorAngle} openCloseAngle={openCloseAngle} raycast={shellRaycast} />

      <Pick id="terminal" {...pick}>
        <RoundedBox args={[0.5, 0.1, 0.36]} radius={0.03} smoothness={3} position={[0, gy + sy / 2 + 0.05, -0.33]} material={mats.terminalBox} raycast={shellRaycast} />
        <mesh position={[0.27, 0.58, -0.33]} rotation={[0, 0, Math.PI / 2]} material={mats.fitting}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
        </mesh>
        <mesh geometry={geo.cable} material={mats.cable} />
      </Pick>

      <Pick id="motor" {...pick}>
        <mesh position={[(MT.motor.x0 + MT.motor.x1) / 2, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.motor} raycast={shellRaycast}>
          <cylinderGeometry args={[MT.motor.radius, MT.motor.radius, MT.motor.x1 - MT.motor.x0, 40, 1, true]} />
        </mesh>
        <mesh position={[MT.motor.x1, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.motor} raycast={shellRaycast}>
          <cylinderGeometry args={[MT.motor.radius, MT.motor.radius - 0.03, 0.05, 40]} />
        </mesh>
        <mesh position={[MT.motor.x1 + 0.01, W.y, W.z]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 0.35, 1]} material={mats.motor} raycast={shellRaycast}>
          <sphereGeometry args={[MT.motor.radius - 0.01, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <group ref={rotor} position={[(MT.motor.x0 + MT.motor.x1) / 2, W.y, W.z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.rotor}>
            <cylinderGeometry args={[0.13, 0.13, MT.motor.x1 - MT.motor.x0 - 0.12, 32]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, 0.135 * Math.cos((i * Math.PI) / 2), 0.135 * Math.sin((i * Math.PI) / 2)]} material={mats.knob}>
              <boxGeometry args={[MT.motor.x1 - MT.motor.x0 - 0.14, 0.02, 0.02]} />
            </mesh>
          ))}
        </group>
      </Pick>

      <group ref={worm} position={[0, W.y, W.z]}>
        <Pick id="worm" {...pick}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
            <cylinderGeometry args={[0.032, 0.032, W.x1 - W.x0, 16]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
            <cylinderGeometry args={[W.pitchRadius - 0.012, W.pitchRadius - 0.012, W.threadLength, 24]} />
          </mesh>
          <mesh geometry={geo.wormThread} material={mats.worm} />
        </Pick>
      </group>
      <Pick id="torque-sensor" {...pick}>
        <mesh position={[0.43, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.torqueSensor}>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
        </mesh>
      </Pick>

      {/* Hollow output with full worm wheel, encoder and drive bush, all turning together */}
      <group ref={output}>
        <Pick id="worm-wheel" {...pick}>
          <mesh position={[0, MT.wheel.y, 0]} material={mats.wormWheel}>
            <cylinderGeometry args={[MT.wheel.pitchRadius - TOOTH / 2, MT.wheel.pitchRadius - TOOTH / 2, MT.wheel.thickness, 64]} />
          </mesh>
          {geo.teeth.map((a) => (
            <mesh key={a} position={[MT.wheel.pitchRadius * Math.sin(a), MT.wheel.y, MT.wheel.pitchRadius * Math.cos(a)]} rotation={[0, a, 0]} material={mats.wormWheel}>
              <boxGeometry args={[WHEEL_PITCH * 0.45, MT.wheel.thickness, TOOTH]} />
            </mesh>
          ))}
        </Pick>
        <Pick id="output-shaft" {...pick}>
          <mesh geometry={geo.hollow} position={[0, MT.hollowShaft.bottom, 0]} material={mats.shaft} />
        </Pick>
        <Pick id="encoder" {...pick}>
          <mesh position={[0, 0.5, 0]} material={mats.encoder}>
            <cylinderGeometry args={[0.13, 0.13, 0.025, 32, 1, true]} />
          </mesh>
          <mesh position={[0.12, 0.5, 0]} material={mats.knob}>
            <boxGeometry args={[0.03, 0.03, 0.012]} />
          </mesh>
        </Pick>
        <Pick id="stem-nut" {...pick}>
          <mesh position={[0, MT.stemNut.y, 0]} material={mats.stemNut}>
            <cylinderGeometry args={[MT.stemNut.radius, MT.stemNut.radius, MT.stemNut.height, 32, 1, true]} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.075, MT.stemNut.y + MT.stemNut.height / 2 + 0.02, 0]} material={mats.stemNut}>
              <boxGeometry args={[0.04, 0.04, 0.06]} />
            </mesh>
          ))}
        </Pick>
      </group>

      {/* Handwheel on top: engaged in hand, otherwise stationary */}
      <Pick id="handwheel" {...pick}>
        <group ref={hand} position={[0, MT.handwheel.y, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.handwheel}>
            <torusGeometry args={[MT.handwheel.radius, 0.026, 10, 64]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, 0, 0]} material={mats.handwheel}>
              <boxGeometry args={[0.03, 0.025, MT.handwheel.radius * 2 - 0.02]} />
            </mesh>
          ))}
          <mesh material={mats.handwheel}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 24, 1, true]} />
          </mesh>
          <mesh position={[MT.handwheel.radius * 0.72, 0.06, 0]} material={mats.knob}>
            <cylinderGeometry args={[0.022, 0.022, 0.1, 12]} />
          </mesh>
        </group>
        <group position={[-sx / 2 - 0.015, 0.15, 0.12]} rotation={[handMode ? -0.7 : 0, 0, 0]}>
          <mesh position={[0, 0.06, 0]} material={mats.lever} raycast={shellRaycast}>
            <boxGeometry args={[0.025, 0.14, 0.03]} />
          </mesh>
        </group>
      </Pick>
      <Pick id="stem-cover" {...pick}>
        <mesh position={[0, (MT.coverTube.top + MT.coverTube.bottom) / 2, 0]} material={mats.coverTube} raycast={shellRaycast}>
          <cylinderGeometry args={[MT.coverTube.radius, MT.coverTube.radius, MT.coverTube.top - MT.coverTube.bottom, 24]} />
        </mesh>
      </Pick>

      {/* Thrust base (ISO 5210 flange) */}
      <Pick id="thrust-base" {...pick}>
        <mesh position={[0, (MT.thrustBase.top + MT.thrustBase.bottom) / 2, 0]} material={mats.thrustBase} raycast={shellRaycast}>
          <cylinderGeometry args={[MT.thrustBase.radius, MT.thrustBase.radius + 0.03, MT.thrustBase.top - MT.thrustBase.bottom, 40, 1, true]} />
        </mesh>
        <mesh position={[0, MT.thrustBase.bottom + 0.02, 0]} material={mats.thrustBase} raycast={shellRaycast}>
          <cylinderGeometry args={[0.3, 0.3, 0.04, 40]} />
        </mesh>
        <mesh position={[0, MT.stemNut.y - MT.stemNut.height / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.tieRods}>
          <torusGeometry args={[0.13, 0.018, 8, 32]} />
        </mesh>
      </Pick>

      {/* ---------------- Rising stem and gate (do not rotate) ---------------- */}
      <group ref={stem} position={[0, mtStemBottomY(0), 0]}>
        <Pick id="stem" {...pick}>
          <mesh position={[0, MT_STEM_LENGTH / 2, 0]} material={mats.stem}>
            <cylinderGeometry args={[MT.stem.radius - 0.006, MT.stem.radius - 0.006, MT_STEM_LENGTH, 16]} />
          </mesh>
          <mesh geometry={geo.stemThread} position={[0, MT_STEM_LENGTH - geo.threadLen, 0]} material={mats.stem} />
        </Pick>
      </group>
      <group ref={gate} position={[0, mtGateCentreY(0), 0]}>
        <Pick id="gate" {...pick}>
          <mesh material={mats.gate}>
            <boxGeometry args={[V.gateHalfWidth * 2, V.gateHeight, V.gateThickness]} />
          </mesh>
        </Pick>
      </group>

      {/* ---------------- Gate valve (always sectioned for visibility) ---------------- */}
      <Pick id="bonnet" {...pick}>
        <mesh position={[0, bonnetFlangeY + 0.025, 0]} material={mats.bonnet} raycast={valveRaycast}>
          <cylinderGeometry args={[V.cavityRadius + 0.06, V.cavityRadius + 0.06, 0.05, 40]} />
        </mesh>
        <mesh position={[0, (bonnetFlangeY + 0.05 + MT.thrustBase.bottom) / 2, 0]} material={mats.bonnet} raycast={valveRaycast}>
          <cylinderGeometry args={[V.bonnetRadius, V.bonnetRadius + 0.04, MT.thrustBase.bottom - bonnetFlangeY - 0.05, 32, 1, true]} />
        </mesh>
        {/* packing gland */}
        <mesh position={[0, MT.thrustBase.bottom - 0.06, 0]} material={mats.seat}>
          <cylinderGeometry args={[V.bonnetRadius - 0.02, V.bonnetRadius - 0.02, 0.06, 24, 1, true]} />
        </mesh>
      </Pick>
      <Pick id="valve-body" {...pick}>
        <mesh position={[0, (V.cavityTop + V.bodyBottom) / 2, 0]} material={mats.valveBody} raycast={valveRaycast}>
          <cylinderGeometry args={[V.cavityRadius, V.cavityRadius, V.cavityTop - V.bodyBottom, 48, 1, true]} />
        </mesh>
        <mesh position={[0, V.bodyBottom, 0]} material={mats.valveBody} raycast={valveRaycast}>
          <sphereGeometry args={[V.cavityRadius, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        {[-1, 1].map((k) => (
          <group key={k}>
            <mesh position={[0, V.pipeY, k * ((V.cavityRadius + V.flangeZ) / 2)]} rotation={[Math.PI / 2, 0, 0]} material={mats.valveBody} raycast={valveRaycast}>
              <cylinderGeometry args={[V.pipeRadius + 0.04, V.pipeRadius + 0.04, V.flangeZ - V.cavityRadius, 36, 1, true]} />
            </mesh>
            <mesh position={[0, V.pipeY, k * V.flangeZ]} rotation={[Math.PI / 2, 0, 0]} material={mats.valveBody} raycast={valveRaycast}>
              <cylinderGeometry args={[0.42, 0.42, 0.07, 40, 1, true]} />
            </mesh>
            <mesh position={[0, V.pipeY, k * ((V.flangeZ + V.pipeEndZ) / 2)]} rotation={[Math.PI / 2, 0, 0]} material={mats.pipe} raycast={valveRaycast}>
              <cylinderGeometry args={[V.pipeRadius, V.pipeRadius, V.pipeEndZ - V.flangeZ, 36, 1, true]} />
            </mesh>
            {/* seat ring each side of the gate */}
            <mesh position={[0, V.pipeY, k * (V.gateThickness / 2 + 0.02)]} material={mats.seat}>
              <torusGeometry args={[V.pipeRadius + 0.01, 0.022, 10, 40]} />
            </mesh>
          </group>
        ))}
      </Pick>

      {showLabels && (
        <>
          <Label position={[0.72, 0.52, W.z]}>Motor</Label>
          <Label position={[0, 0.4, W.z - 0.05]}>Worm drives full wheel</Label>
          <Label position={[0.32, -0.14, 0.12]}>Stem nut turns, stem rises</Label>
          <Label position={[0, MT.handwheel.y + 0.12, 0.3]}>{handMode ? "Handwheel engaged" : "Handwheel disengaged"}</Label>
          <Label position={[0.45, V.pipeY, 0.1]}>Wedge gate lifts clear of the bore</Label>
        </>
      )}
      <instancedMesh ref={markers} args={[markerGeo, markerMat, PER_STREAM * FLOW_STREAMS.length]} raycast={() => null} frustumCulled={false} />
    </group>
  );
}
