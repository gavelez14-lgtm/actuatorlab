"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { EPT, EPT_PITCH, eptOutputRotationY, eptWormRotation } from "@/lib/sim/electricGeometry";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick } from "./parts";
import { ValveAssembly } from "./ValveAssembly";

/**
 * Electric part-turn actuator: motor coaxial with a single-start worm, worm
 * wheel segment on the output, torque sensor at the worm shaft end, absolute
 * encoder on the output, geared handwheel with hand/auto lever, front control
 * cover with display and two selectors, separate terminal compartment.
 * See electricGeometry.ts for sources. Proportions are original.
 */

const W = EPT.worm;
const TOOTH = 0.026;

export class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private x0: number,
    private length: number,
    private radius: number,
    private turns: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(this.x0 + t * this.length, this.radius * Math.cos(a), this.radius * Math.sin(a));
  }
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FLOW_CURVES = {
  cable: new THREE.CatmullRomCurve3([v(1.45, -0.55, -1.0), v(1.1, 0.25, -0.75), v(0.62, 0.48, -0.42), v(0.27, 0.45, -0.33)]),
  internal: new THREE.CatmullRomCurve3([v(0.12, 0.42, -0.33), v(0.4, 0.34, -0.36), v(0.72, 0.26, W.z)]),
  // mechanical paths run just outside the parts so the markers stay visible
  worm: new THREE.CatmullRomCurve3([v(0.62, W.y + 0.1, W.z), v(0.3, W.y + 0.1, W.z), v(0.02, W.y + 0.1, W.z)]),
  output: new THREE.CatmullRomCurve3([v(0, W.y + 0.1, -0.27), v(0.08, W.y + 0.1, -0.1), v(0.13, -0.2, 0), v(0.13, -0.78, 0)]),
};
const FLOW_STREAMS: { curve: keyof typeof FLOW_CURVES; color: THREE.Color }[] = [
  { curve: "cable", color: new THREE.Color("#FFD60A") },
  { curve: "internal", color: new THREE.Color("#FFD60A") },
  { curve: "worm", color: new THREE.Color("#FF9F0A") },
  { curve: "output", color: new THREE.Color("#FF9F0A") },
];
const PER_STREAM = 7;

export function DisplayFace({
  mats,
  pick,
  y = EPT.cover.y,
  z = EPT.cover.z + EPT.cover.depth,
}: {
  mats: MaterialSet;
  pick: { onSelect: (id: ComponentId) => void; onHover: (id: ComponentId | null) => void };
  y?: number;
  z?: number;
}) {
  const pctOpen = useSimSelector((s) => Math.round(s.position * 100));
  const label = useSimSelector((s) =>
    s.electric.tripped ? "TORQUE TRIP" : s.electric.handMode ? "HAND" : s.airFlowing ? (s.direction === "opening" ? "OPENING" : "CLOSING") : !s.supplyAvailable ? "BATTERY" : s.position > 0.995 ? "OPEN" : s.position < 0.005 ? "CLOSED" : "STOPPED",
  );
  const invalidate = useThree((s) => s.invalidate);
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: t };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    const g = canvas.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = "#0b1116";
    g.beginPath();
    g.arc(128, 128, 128, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = label === "TORQUE TRIP" ? "#ff6b5e" : "#e9f2f7";
    g.font = "600 84px -apple-system, Inter, Helvetica, Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(`${pctOpen}`, 118, 118);
    g.font = "500 30px -apple-system, Inter, Helvetica, Arial, sans-serif";
    g.fillText("%", 196, 132);
    g.fillStyle = label === "TORQUE TRIP" ? "#ff6b5e" : "#ffb340";
    g.font = "600 22px -apple-system, Inter, Helvetica, Arial, sans-serif";
    g.fillText(label, 128, 192);
    texture.needsUpdate = true;
    invalidate();
  }, [pctOpen, label, canvas, texture, invalidate]);
  return (
    <Pick id="local-controls" {...pick}>
      <mesh position={[0, y + 0.05, z + 0.006]} material={mats.knob}>
        <circleGeometry args={[0.135, 48]} />
      </mesh>
      <mesh position={[0, y + 0.05, z + 0.008]}>
        <circleGeometry args={[0.125, 48]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </Pick>
  );
}

export function ElectricPartTurnModel({
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
  const reduced = usePrefersReducedMotion();
  const pick = { onSelect, onHover };

  const geo = useMemo(() => {
    const thread = new THREE.TubeGeometry(new HelixCurve(-W.threadLength / 2, W.threadLength, W.pitchRadius, W.threadLength / EPT_PITCH), 260, 0.013, 6, false);
    // wheel segment: pie sector facing the worm through the whole stroke
    const a0 = Math.PI - eptOutputRotationY(0) - EPT.wheel.extra;
    const a1 = Math.PI - eptOutputRotationY(1) + EPT.wheel.extra;
    const sector = new THREE.CylinderGeometry(EPT.wheel.pitchRadius - TOOTH / 2, EPT.wheel.pitchRadius - TOOTH / 2, EPT.wheel.thickness, 48, 1, false, a0, a1 - a0);
    const teeth: number[] = [];
    const step = (2 * Math.PI) / EPT.wheel.teeth;
    // phase a tooth onto the contact line (world angle pi) at stroke 0
    const contact = Math.PI - eptOutputRotationY(0);
    for (let k = -40; k <= 40; k++) {
      const a = contact + k * step;
      if (a >= a0 + step / 2 && a <= a1 - step / 2) teeth.push(a);
    }
    const tubes = {
      cable: new THREE.TubeGeometry(FLOW_CURVES.cable, 48, 0.03, 8, false),
    };
    return { thread, sector, teeth, a0, a1, tubes };
  }, []);
  useEffect(
    () => () => {
      geo.thread.dispose();
      geo.sector.dispose();
      geo.tubes.cable.dispose();
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

  const output = useRef<THREE.Group>(null);
  const worm = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const hand = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const markers = useRef<THREE.InstancedMesh>(null);
  const motorAngle = useRef(0);
  const handAngle = useRef(0);
  const lastWorm = useRef(eptWormRotation(0));
  const phase = useRef(0);
  const couplingOffset = Math.PI / 4;
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
    const rot = eptOutputRotationY(s.stroke);
    const w = eptWormRotation(s.stroke);
    const dw = w - lastWorm.current;
    lastWorm.current = w;
    // Motor turns with the worm only when clutched in (auto); handwheel only in hand.
    if (s.electric.handMode) handAngle.current += dw;
    else motorAngle.current += dw;
    if (output.current) output.current.rotation.y = rot;
    if (ball.current) ball.current.rotation.y = rot + couplingOffset;
    if (worm.current) worm.current.rotation.x = w;
    if (rotor.current) rotor.current.rotation.x = motorAngle.current;
    if (hand.current) hand.current.rotation.x = handAngle.current;

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

  const [gx, gy, gz] = EPT.gearcase.centre;
  const [sx, sy, sz] = EPT.gearcase.size;
  const selectorAngle = selector === "local" ? Math.PI / 4 : selector === "remote" ? -Math.PI / 4 : 0;
  const stopAngles = [geo.a0 - 0.05 + eptOutputRotationY(1), geo.a1 + 0.05 + eptOutputRotationY(0)];

  return (
    <group ref={rootRef}>
      {/* Gearcase and ISO base */}
      <Pick id="housing" {...pick}>
        <RoundedBox args={[sx, sy, sz]} radius={0.08} smoothness={4} position={[gx, gy, gz]} material={mats.housing} raycast={shellRaycast} />
        <mesh position={[0, (EPT.base.top + EPT.base.bottom) / 2, 0]} material={mats.housingTrim} raycast={shellRaycast}>
          <boxGeometry args={[EPT.base.half * 2, EPT.base.top - EPT.base.bottom, EPT.base.half * 2]} />
        </mesh>
      </Pick>

      {/* Front control cover with display and two selectors */}
      <Pick id="local-controls" {...pick}>
        <mesh position={[0, EPT.cover.y, EPT.cover.z + EPT.cover.depth / 2]} rotation={[Math.PI / 2, 0, 0]} material={mats.controlCover} raycast={shellRaycast}>
          <cylinderGeometry args={[EPT.cover.radius, EPT.cover.radius, EPT.cover.depth, 48]} />
        </mesh>
        {[
          { x: -0.13, angle: selectorAngle },
          { x: 0.13, angle: 0 },
        ].map((k) => (
          <group key={k.x} position={[k.x, EPT.cover.y - 0.14, EPT.cover.z + EPT.cover.depth + 0.03]} rotation={[0, 0, k.angle]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.knob}>
              <cylinderGeometry args={[0.05, 0.055, 0.06, 24]} />
            </mesh>
            <mesh position={[0, 0.0, 0.032]} material={mats.indicatorStripe}>
              <boxGeometry args={[0.014, 0.075, 0.006]} />
            </mesh>
          </group>
        ))}
      </Pick>
      <DisplayFace mats={mats} pick={pick} />

      {/* Terminal compartment and incoming cable */}
      <Pick id="terminal" {...pick}>
        <RoundedBox args={[...EPT.terminal.size]} radius={0.03} smoothness={3} position={[...EPT.terminal.centre]} material={mats.terminalBox} raycast={shellRaycast} />
        <mesh position={[0.27, 0.45, -0.33]} rotation={[0, 0, Math.PI / 2]} material={mats.fitting}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
        </mesh>
        <mesh geometry={geo.tubes.cable} material={mats.cable} />
      </Pick>

      {/* Motor: shell is clipped in section; rotor inside turns only when clutched in */}
      <Pick id="motor" {...pick}>
        <mesh position={[(EPT.motor.x0 + EPT.motor.x1) / 2, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.motor} raycast={shellRaycast}>
          <cylinderGeometry args={[EPT.motor.radius, EPT.motor.radius, EPT.motor.x1 - EPT.motor.x0, 40, 1, true]} />
        </mesh>
        <mesh position={[EPT.motor.x1, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.motor} raycast={shellRaycast}>
          <cylinderGeometry args={[EPT.motor.radius, EPT.motor.radius - 0.03, 0.05, 40]} />
        </mesh>
        {[0.15, 0.3, 0.45].map((f) => (
          <mesh key={f} position={[EPT.motor.x0 + f, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.motor} raycast={shellRaycast}>
            <torusGeometry args={[EPT.motor.radius + 0.005, 0.012, 6, 40]} />
          </mesh>
        ))}
        <group ref={rotor} position={[(EPT.motor.x0 + EPT.motor.x1) / 2, W.y, W.z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.rotor}>
            <cylinderGeometry args={[0.13, 0.13, EPT.motor.x1 - EPT.motor.x0 - 0.12, 32]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, 0.135 * Math.cos((i * Math.PI) / 2), 0.135 * Math.sin((i * Math.PI) / 2)]} material={mats.knob}>
              <boxGeometry args={[EPT.motor.x1 - EPT.motor.x0 - 0.14, 0.02, 0.02]} />
            </mesh>
          ))}
        </group>
      </Pick>

      {/* Worm shaft (locked to the output by the ratio) */}
      <group ref={worm} position={[0, W.y, W.z]}>
        <Pick id="worm" {...pick}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
            <cylinderGeometry args={[0.032, 0.032, W.x1 - W.x0, 16]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
            <cylinderGeometry args={[W.pitchRadius - 0.012, W.pitchRadius - 0.012, W.threadLength, 24]} />
          </mesh>
          <mesh geometry={geo.thread} material={mats.worm} />
        </Pick>
      </group>
      <Pick id="torque-sensor" {...pick}>
        <mesh position={[0.43, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.torqueSensor}>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
        </mesh>
      </Pick>

      {/* Handwheel and hand/auto lever */}
      <Pick id="handwheel" {...pick}>
        <group ref={hand} position={[EPT.handwheel.x, W.y, W.z]}>
          <mesh rotation={[0, Math.PI / 2, 0]} material={mats.handwheel}>
            <torusGeometry args={[EPT.handwheel.radius, 0.024, 10, 56]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[(i * 2 * Math.PI) / 3, 0, 0]} position={[0, 0, 0]} material={mats.handwheel}>
              <boxGeometry args={[0.025, EPT.handwheel.radius * 2 - 0.02, 0.03]} />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.handwheel}>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 20]} />
          </mesh>
          <mesh position={[0, EPT.handwheel.radius * 0.7, 0.04]} rotation={[0, 0, Math.PI / 2]} material={mats.knob}>
            <cylinderGeometry args={[0.022, 0.022, 0.1, 12]} />
          </mesh>
        </group>
        <mesh position={[(EPT.handwheel.x - sx / 2) / 2, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
          <cylinderGeometry args={[0.03, 0.03, Math.abs(EPT.handwheel.x + sx / 2), 12]} />
        </mesh>
        <group position={[-sx / 2 - 0.015, -0.1, 0.12]} rotation={[handMode ? -0.7 : 0, 0, 0]}>
          <mesh position={[0, 0.06, 0]} material={mats.lever} raycast={shellRaycast}>
            <boxGeometry args={[0.025, 0.14, 0.03]} />
          </mesh>
        </group>
      </Pick>

      {/* Output: wheel segment, shaft, encoder, coupling */}
      <group ref={output} rotation={[0, eptOutputRotationY(0), 0]}>
        <Pick id="worm-wheel" {...pick}>
          <mesh position={[0, EPT.wheel.y, 0]} geometry={geo.sector} material={mats.wormWheel} />
          {geo.teeth.map((a) => (
            <mesh key={a} position={[EPT.wheel.pitchRadius * Math.sin(a), EPT.wheel.y, EPT.wheel.pitchRadius * Math.cos(a)]} rotation={[0, a, 0]} material={mats.wormWheel}>
              <boxGeometry args={[EPT_PITCH * 0.45, EPT.wheel.thickness, TOOTH]} />
            </mesh>
          ))}
        </Pick>
        <Pick id="output-shaft" {...pick}>
          <mesh position={[0, (0.34 - 0.8) / 2, 0]} material={mats.shaft}>
            <cylinderGeometry args={[0.07, 0.07, 0.34 + 0.8, 24]} />
          </mesh>
          <mesh position={[0, -0.68, 0]} material={mats.stem}>
            <cylinderGeometry args={[0.13, 0.13, 0.24, 6]} />
          </mesh>
        </Pick>
        <Pick id="encoder" {...pick}>
          <mesh position={[0, 0.34, 0]} material={mats.encoder}>
            <cylinderGeometry args={[0.07, 0.07, 0.025, 32]} />
          </mesh>
          <mesh position={[0.045, 0.355, 0]} material={mats.knob}>
            <boxGeometry args={[0.03, 0.01, 0.012]} />
          </mesh>
        </Pick>
      </group>
      <Pick id="travel-stops" {...pick}>
        {stopAngles.map((a) => (
          <mesh key={a} position={[(EPT.wheel.pitchRadius - 0.06) * Math.sin(a), EPT.wheel.y, (EPT.wheel.pitchRadius - 0.06) * Math.cos(a)]} rotation={[0, a, 0]} material={mats.stopBolt}>
            <boxGeometry args={[0.04, EPT.wheel.thickness + 0.05, 0.1]} />
          </mesh>
        ))}
      </Pick>

      {showLabels && (
        <>
          <Label position={[0.72, 0.42, W.z]}>Motor: fast, low torque</Label>
          <Label position={[0, 0.3, W.z - 0.05]}>Worm: {15} turns per 90°</Label>
          <Label position={[0.25, 0.25, 0.12]}>Wheel segment: slow, high torque</Label>
          <Label position={[0.43, -0.12, W.z]}>Torque sensor</Label>
          <Label position={[EPT.handwheel.x, 0.42, W.z]}>{handMode ? "Handwheel engaged" : "Handwheel declutched"}</Label>
        </>
      )}

      <ValveAssembly mats={mats} pick={pick} ballRef={ball} ballRotation={eptOutputRotationY(0) + couplingOffset} cutaway={cutaway} showLabels={showLabels} />
      <instancedMesh ref={markers} args={[markerGeo, markerMat, PER_STREAM * FLOW_STREAMS.length]} raycast={() => null} frustumCulled={false} />
    </group>
  );
}
