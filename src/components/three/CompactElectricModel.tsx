"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { COMPACT } from "@/lib/sim/electric";
import { CPT, CPT_SPUR_RATIO, cptOutputRotationY, cptWormRotation } from "@/lib/sim/compactGeometry";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { SECTION_PLANE, makeShellRaycast, type MaterialSet } from "./materials";
import { Label, Pick } from "./parts";
import { ValveAssembly } from "./ValveAssembly";
import { HelixCurve } from "./ElectricPartTurnModel";

/**
 * Compact electromechanical part-turn actuator on the ball valve.
 * Motor -> spur pinion/gear (stage 1) -> worm -> wheel segment (stage 2) ->
 * output. Cams on the output operate the open/close limit switches; the worm
 * shaft end acts on a spring-set torque switch; a domed indicator on top shows
 * position mechanically. See compactGeometry.ts for sources.
 */

const W = CPT.worm;
const TOOTH = 0.02;
const WHEEL_PITCH = (2 * Math.PI * CPT.wheel.pitchRadius) / CPT.wheel.teeth;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FLOW_CURVES = {
  cable: new THREE.CatmullRomCurve3([v(1.1, -0.6, 0.6), v(0.75, -0.15, 0.4), v(0.42, -0.08, 0.12)]),
  internal: new THREE.CatmullRomCurve3([v(0.36, -0.05, 0.05), v(0.3, 0.12, -0.08), v(0.15, CPT.motor.y + 0.12, CPT.motor.z)]),
  drive: new THREE.CatmullRomCurve3([v(0.36, CPT.motor.y + 0.03, CPT.motor.z), v(0.36, 0.06, W.z), v(0.1, W.y + 0.08, W.z), v(0, W.y + 0.08, W.z + 0.06)]),
  output: new THREE.CatmullRomCurve3([v(0.02, 0.08, -0.08), v(0.11, -0.05, 0), v(0.11, -0.4, 0), v(0.11, -0.78, 0)]),
};
const FLOW_STREAMS: { curve: keyof typeof FLOW_CURVES; color: THREE.Color }[] = [
  { curve: "cable", color: new THREE.Color("#FFD60A") },
  { curve: "internal", color: new THREE.Color("#FFD60A") },
  { curve: "drive", color: new THREE.Color("#FF9F0A") },
  { curve: "output", color: new THREE.Color("#FF9F0A") },
];
const PER_STREAM = 6;

function gearTeeth(radius: number, count: number, phase = 0) {
  return Array.from({ length: count }, (_, k) => phase + (k * 2 * Math.PI) / count).map((a) => ({ a, r: radius }));
}

export function CompactElectricModel({
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
  const handMode = useSimSelector((s) => s.electric.handMode);
  const tripped = useSimSelector((s) => s.electric.tripped !== null);
  const reduced = usePrefersReducedMotion();
  const pick = { onSelect, onHover };

  const geo = useMemo(() => {
    const thread = new THREE.TubeGeometry(new HelixCurve(-W.threadLength / 2, W.threadLength, W.pitchRadius, W.threadLength / WHEEL_PITCH), 200, 0.011, 6, false);
    const a0 = Math.PI - cptOutputRotationY(0) - CPT.wheel.extra;
    const a1 = Math.PI - cptOutputRotationY(1) + CPT.wheel.extra;
    const sector = new THREE.CylinderGeometry(CPT.wheel.pitchRadius - TOOTH / 2, CPT.wheel.pitchRadius - TOOTH / 2, CPT.wheel.thickness, 40, 1, false, a0, a1 - a0);
    const step = (2 * Math.PI) / CPT.wheel.teeth;
    const contact = Math.PI - cptOutputRotationY(0);
    const wheelTeeth: number[] = [];
    for (let k = -30; k <= 30; k++) {
      const a = contact + k * step;
      if (a >= a0 + step / 2 && a <= a1 - step / 2) wheelTeeth.push(a);
    }
    const cable = new THREE.TubeGeometry(FLOW_CURVES.cable, 40, 0.025, 8, false);
    const torqueSpring = new THREE.TubeGeometry(new HelixCurve(0, 0.08, 0.035, 5), 120, 0.006, 5, false);
    return { thread, sector, wheelTeeth, a0, a1, cable, torqueSpring };
  }, []);
  useEffect(
    () => () => {
      geo.thread.dispose();
      geo.sector.dispose();
      geo.cable.dispose();
      geo.torqueSpring.dispose();
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
  const motor = useRef<THREE.Group>(null);
  const hand = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const leverOpen = useRef<THREE.Mesh>(null);
  const leverClose = useRef<THREE.Mesh>(null);
  const markers = useRef<THREE.InstancedMesh>(null);
  const motorAngle = useRef(0);
  const handAngle = useRef(0);
  const lastWorm = useRef(0);
  const phase = useRef(0);
  const couplingOffset = Math.PI / 4;
  const markerGeo = useMemo(() => new THREE.ConeGeometry(0.03, 0.085, 10).rotateX(Math.PI / 2), []);
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
    const rot = cptOutputRotationY(s.stroke);
    const w = cptWormRotation(s.stroke);
    const dw = w - lastWorm.current;
    lastWorm.current = w;
    if (s.electric.handMode) handAngle.current += dw;
    else motorAngle.current -= dw * CPT_SPUR_RATIO; // pinion turns opposite to the gear, faster by the ratio
    if (output.current) output.current.rotation.y = rot;
    if (ball.current) ball.current.rotation.y = rot + couplingOffset;
    if (worm.current) worm.current.rotation.x = w;
    if (motor.current) motor.current.rotation.x = motorAngle.current;
    if (hand.current) hand.current.rotation.x = handAngle.current;
    // Limit switch levers are pressed by the cam lobes at each end of travel.
    const band = COMPACT.limitBand;
    if (leverOpen.current) leverOpen.current.rotation.z = s.stroke >= 1 - band ? -0.45 : 0;
    if (leverClose.current) leverClose.current.rotation.z = s.stroke <= band ? -0.45 : 0;

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

  const [cx, cy, cz] = CPT.case.centre;
  const [sx, sy, sz] = CPT.case.size;
  const spurGearTeeth = gearTeeth(CPT.spur.gearRadius, CPT.spur.teethGear);
  const pinionTeeth = gearTeeth(CPT.spur.pinionRadius, CPT.spur.teethPinion, Math.PI / CPT.spur.teethPinion);
  const stopAngles = [geo.a0 - 0.06 + cptOutputRotationY(1), geo.a1 + 0.06 + cptOutputRotationY(0)];
  // Cam lobes: open cam faces the switch (+X, angle pi/2) at stroke 1, close cam at stroke 0.
  const openLobe = Math.PI / 2 - cptOutputRotationY(1);
  const closeLobe = Math.PI / 2 - cptOutputRotationY(0);

  return (
    <group ref={rootRef}>
      {/* Case and ISO 5211 base */}
      <Pick id="housing" {...pick}>
        <RoundedBox args={[sx, sy, sz]} radius={0.06} smoothness={4} position={[cx, cy, cz]} material={mats.housing} raycast={shellRaycast} />
        <mesh position={[0, (CPT.base.top + CPT.base.bottom) / 2, 0]} material={mats.housingTrim} raycast={shellRaycast}>
          <boxGeometry args={[CPT.base.half * 2, CPT.base.top - CPT.base.bottom, CPT.base.half * 2]} />
        </mesh>
        {/* cable entries */}
        {[-0.07, 0.07].map((z) => (
          <mesh key={z} position={[cx + sx / 2 + 0.03, -0.08, z]} rotation={[0, 0, Math.PI / 2]} material={mats.fitting}>
            <cylinderGeometry args={[0.03, 0.03, 0.06, 14]} />
          </mesh>
        ))}
        <mesh geometry={geo.cable} material={mats.cable} />
      </Pick>

      {/* Motor with pinion (stage 1 input) */}
      <Pick id="motor" {...pick}>
        <mesh position={[(CPT.motor.x0 + CPT.motor.x1) / 2, CPT.motor.y, CPT.motor.z]} rotation={[0, 0, Math.PI / 2]} material={mats.motor} raycast={shellRaycast}>
          <cylinderGeometry args={[CPT.motor.radius, CPT.motor.radius, CPT.motor.x1 - CPT.motor.x0, 32, 1, true]} />
        </mesh>
        <group ref={motor} position={[0, CPT.motor.y, CPT.motor.z]}>
          <mesh position={[(CPT.motor.x0 + CPT.motor.x1) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.rotor}>
            <cylinderGeometry args={[CPT.motor.radius - 0.025, CPT.motor.radius - 0.025, CPT.motor.x1 - CPT.motor.x0 - 0.06, 24]} />
          </mesh>
          <Pick id="spur-gears" {...pick}>
            <mesh position={[CPT.spur.x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.spurGear}>
              <cylinderGeometry args={[CPT.spur.pinionRadius - TOOTH / 2, CPT.spur.pinionRadius - TOOTH / 2, 0.05, 20]} />
            </mesh>
            {pinionTeeth.map((t) => (
              <mesh key={t.a} position={[CPT.spur.x, t.r * Math.cos(t.a), t.r * Math.sin(t.a)]} rotation={[t.a, 0, 0]} material={mats.spurGear}>
                <boxGeometry args={[0.05, TOOTH, 0.012]} />
              </mesh>
            ))}
          </Pick>
        </group>
      </Pick>

      {/* Worm shaft with stage-1 spur gear on its end */}
      <group ref={worm} position={[0, W.y, W.z]}>
        <Pick id="worm" {...pick}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
            <cylinderGeometry args={[0.025, 0.025, W.x1 - W.x0, 14]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
            <cylinderGeometry args={[W.pitchRadius - 0.01, W.pitchRadius - 0.01, W.threadLength, 20]} />
          </mesh>
          <mesh geometry={geo.thread} material={mats.worm} />
        </Pick>
        <Pick id="spur-gears" {...pick}>
          <mesh position={[CPT.spur.x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.spurGear}>
            <cylinderGeometry args={[CPT.spur.gearRadius - TOOTH / 2, CPT.spur.gearRadius - TOOTH / 2, 0.05, 40]} />
          </mesh>
          {spurGearTeeth.map((t) => (
            <mesh key={t.a} position={[CPT.spur.x, t.r * Math.cos(t.a), t.r * Math.sin(t.a)]} rotation={[t.a, 0, 0]} material={mats.spurGear}>
              <boxGeometry args={[0.05, TOOTH, 0.016]} />
            </mesh>
          ))}
        </Pick>
      </group>

      {/* Spring-set mechanical torque switch at the worm shaft end */}
      <Pick id="torque-switch" {...pick}>
        <mesh geometry={geo.torqueSpring} position={[W.x0 + 0.02, W.y, W.z]} material={mats.torqueSwitch} />
        <mesh position={[W.x0 + 0.06, W.y + 0.07, W.z]} material={mats.switchBody}>
          <boxGeometry args={[0.06, 0.04, 0.05]} />
        </mesh>
        <mesh position={[W.x0 + 0.06, W.y + 0.045, W.z]} rotation={[0, 0, tripped ? -0.5 : 0]} material={tripped ? mats.domeArrow : mats.switchLever}>
          <boxGeometry args={[0.008, 0.035, 0.012]} />
        </mesh>
      </Pick>

      {/* Output: wheel segment, cams, shaft, indicator disc */}
      <group ref={output} rotation={[0, cptOutputRotationY(0), 0]}>
        <Pick id="worm-wheel" {...pick}>
          <mesh position={[0, CPT.wheel.y, 0]} geometry={geo.sector} material={mats.wormWheel} />
          {geo.wheelTeeth.map((a) => (
            <mesh key={a} position={[CPT.wheel.pitchRadius * Math.sin(a), CPT.wheel.y, CPT.wheel.pitchRadius * Math.cos(a)]} rotation={[0, a, 0]} material={mats.wormWheel}>
              <boxGeometry args={[WHEEL_PITCH * 0.45, CPT.wheel.thickness, TOOTH]} />
            </mesh>
          ))}
        </Pick>
        <Pick id="limit-switches" {...pick}>
          {[
            { y: CPT.cams.yOpen, lobe: openLobe },
            { y: CPT.cams.yClose, lobe: closeLobe },
          ].map((c) => (
            <group key={c.y} position={[0, c.y, 0]}>
              <mesh material={mats.cam}>
                <cylinderGeometry args={[CPT.cams.radius, CPT.cams.radius, 0.02, 28]} />
              </mesh>
              <mesh position={[0.045 * Math.sin(c.lobe), 0, 0.045 * Math.cos(c.lobe)]} rotation={[0, c.lobe, 0]} material={mats.cam}>
                <boxGeometry args={[0.03, 0.02, 0.04]} />
              </mesh>
            </group>
          ))}
        </Pick>
        <Pick id="output-shaft" {...pick}>
          <mesh position={[0, (0.33 - 0.8) / 2, 0]} material={mats.shaft}>
            <cylinderGeometry args={[0.055, 0.055, 0.33 + 0.8, 20]} />
          </mesh>
          <mesh position={[0, -0.68, 0]} material={mats.stem}>
            <cylinderGeometry args={[0.13, 0.13, 0.24, 6]} />
          </mesh>
        </Pick>
        <Pick id="dome-indicator" {...pick}>
          <mesh position={[0, CPT.dome.y + 0.03, 0]} material={mats.domeDisc}>
            <cylinderGeometry args={[CPT.dome.radius - 0.015, CPT.dome.radius - 0.015, 0.012, 40]} />
          </mesh>
          <group position={[0, CPT.dome.y + 0.04, 0]} rotation={[0, couplingOffset, 0]}>
            <mesh material={mats.domeArrow}>
              <boxGeometry args={[0.035, 0.012, 0.2]} />
            </mesh>
            <mesh position={[0, 0, -0.11]} rotation={[-Math.PI / 2, 0, 0]} material={mats.domeArrow}>
              <coneGeometry args={[0.035, 0.05, 3]} />
            </mesh>
          </group>
        </Pick>
      </group>

      {/* Fixed limit switches the cams press */}
      <Pick id="limit-switches" {...pick}>
        {[
          { y: CPT.cams.yOpen, ref: leverOpen },
          { y: CPT.cams.yClose, ref: leverClose },
        ].map((sw) => (
          <group key={sw.y} position={[CPT.cams.switchX, sw.y, 0]}>
            <mesh position={[0.04, 0, 0]} material={mats.switchBody}>
              <boxGeometry args={[0.05, 0.03, 0.06]} />
            </mesh>
            <mesh ref={sw.ref} position={[0.012, 0, 0]} material={mats.switchLever}>
              <boxGeometry args={[0.03, 0.006, 0.012]} />
            </mesh>
          </group>
        ))}
      </Pick>

      {/* Dome over the indicator */}
      <Pick id="dome-indicator" {...pick}>
        <mesh position={[0, CPT.dome.y, 0]} material={mats.housingTrim} raycast={shellRaycast}>
          <cylinderGeometry args={[CPT.dome.radius + 0.015, CPT.dome.radius + 0.02, 0.03, 40]} />
        </mesh>
        <mesh position={[0, CPT.dome.y + 0.015, 0]} material={mats.dome}>
          <sphereGeometry args={[CPT.dome.radius, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </Pick>

      {/* Stop bolts */}
      <Pick id="travel-stops" {...pick}>
        {stopAngles.map((a) => (
          <mesh key={a} position={[(CPT.wheel.pitchRadius - 0.04) * Math.sin(a), CPT.wheel.y, (CPT.wheel.pitchRadius - 0.04) * Math.cos(a)]} rotation={[0, a, 0]} material={mats.stopBolt}>
            <boxGeometry args={[0.03, CPT.wheel.thickness + 0.04, 0.07]} />
          </mesh>
        ))}
      </Pick>

      {/* Side handwheel and lockable manual/auto lever */}
      <Pick id="handwheel" {...pick}>
        <group ref={hand} position={[CPT.handwheel.x, W.y, W.z]}>
          <mesh rotation={[0, Math.PI / 2, 0]} material={mats.handwheel}>
            <torusGeometry args={[CPT.handwheel.radius, 0.018, 10, 48]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[(i * 2 * Math.PI) / 3, 0, 0]} material={mats.handwheel}>
              <boxGeometry args={[0.02, CPT.handwheel.radius * 2 - 0.02, 0.022]} />
            </mesh>
          ))}
          <mesh position={[0, CPT.handwheel.radius * 0.7, 0.03]} rotation={[0, 0, Math.PI / 2]} material={mats.knob}>
            <cylinderGeometry args={[0.016, 0.016, 0.07, 10]} />
          </mesh>
        </group>
        <mesh position={[(CPT.handwheel.x + cx - sx / 2) / 2, W.y, W.z]} rotation={[0, 0, Math.PI / 2]} material={mats.worm}>
          <cylinderGeometry args={[0.022, 0.022, Math.abs(CPT.handwheel.x - (cx - sx / 2)), 10]} />
        </mesh>
        <group position={[cx - sx / 2 - 0.012, -0.05, 0.1]} rotation={[handMode ? -0.7 : 0, 0, 0]}>
          <mesh position={[0, 0.05, 0]} material={mats.lever} raycast={shellRaycast}>
            <boxGeometry args={[0.02, 0.11, 0.025]} />
          </mesh>
        </group>
      </Pick>

      {showLabels && (
        <>
          <Label position={[0.1, CPT.motor.y + 0.18, CPT.motor.z]}>Motor and pinion: stage 1</Label>
          <Label position={[-0.05, W.y - 0.12, W.z - 0.05]}>Worm and wheel: stage 2</Label>
          <Label position={[0.32, CPT.cams.yClose + 0.1, 0]}>Cams press limit switches</Label>
          <Label position={[W.x0, W.y + 0.2, W.z]}>Torque switch</Label>
          <Label position={[0, CPT.dome.y + 0.24, 0]}>Position indicator</Label>
        </>
      )}

      <ValveAssembly mats={mats} pick={pick} ballRef={ball} ballRotation={cptOutputRotationY(0) + couplingOffset} cutaway={cutaway} showLabels={showLabels} />
      <instancedMesh ref={markers} args={[markerGeo, markerMat, PER_STREAM * FLOW_STREAMS.length]} raycast={() => null} frustumCulled={false} />
    </group>
  );
}
