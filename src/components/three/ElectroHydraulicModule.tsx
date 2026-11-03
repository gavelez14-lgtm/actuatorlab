"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { YOKE_OFFSET } from "@/lib/sim/geometry";
import { EH } from "@/lib/sim/electroHydraulic";
import type { ComponentId } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import type { MaterialSet } from "./materials";
import { Label, Pick } from "./parts";

/**
 * Self-contained hydraulic power pack and integral controller, mounted on the
 * operator side of the cylinder. Original, illustrative layout: reservoir,
 * motor and pump, dump solenoid, pressure gauge and a controller enclosure
 * with a live display.
 */
const Z = -YOKE_OFFSET;
const PZ = 0.22; // power pack centre plane

type PickProps = { onSelect: (id: ComponentId) => void; onHover: (id: ComponentId | null) => void };

function ControllerDisplay({ position }: { position: [number, number, number] }) {
  const pctOpen = useSimSelector((s) => Math.round(s.position * 100));
  const demand = useSimSelector((s) => (s.eh.demand === null ? null : Math.round(s.eh.demand * 100)));
  const label = useSimSelector((s) =>
    s.eh.esd ? "ESD" : s.eh.pst === "out" || s.eh.pst === "back" ? "PST" : s.eh.pst === "failed" ? "PST FAIL" : !s.supplyAvailable ? "NO POWER" : s.eh.motorRunning ? "PUMP" : s.eh.dumping ? "DUMP" : "HOLD",
  );
  const invalidate = useThree((s) => s.invalidate);
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 192;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: t };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    const g = canvas.getContext("2d");
    if (!g) return;
    g.fillStyle = "#0b1116";
    g.fillRect(0, 0, 256, 192);
    const alarm = label === "ESD" || label === "PST FAIL" || label === "NO POWER";
    g.fillStyle = alarm ? "#ff6b5e" : "#e9f2f7";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "600 78px -apple-system, Inter, Helvetica, Arial, sans-serif";
    g.fillText(`${pctOpen}%`, 128, 78);
    g.font = "500 26px -apple-system, Inter, Helvetica, Arial, sans-serif";
    g.fillText(label, 128, 140);
    g.fillStyle = "#8fa3b3";
    g.font = "500 20px -apple-system, Inter, Helvetica, Arial, sans-serif";
    g.fillText(demand === null ? "no demand" : `demand ${demand}%`, 128, 172);
    texture.needsUpdate = true;
    invalidate();
  }, [canvas, texture, pctOpen, demand, label, invalidate]);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.26, 0.195]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export function ElectroHydraulicModule({ mats, pick, showLabels }: { mats: MaterialSet; pick: PickProps; showLabels: boolean }) {
  const { engine } = useEngine();
  const fan = useRef<THREE.Group>(null);
  const needle = useRef<THREE.Group>(null);
  const hose = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(1.9, 0.33, PZ), new THREE.Vector3(1.9, 0.55, 0.05), new THREE.Vector3(1.75, 0.6, -0.25), new THREE.Vector3(1.7, 0.56, Z + 0.17)]);
    return new THREE.TubeGeometry(c, 40, 0.02, 8, false);
  }, []);
  const cable = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(2.48, 0.12, PZ), new THREE.Vector3(2.2, 0.3, PZ + 0.05), new THREE.Vector3(1.75, 0.36, PZ)]);
    return new THREE.TubeGeometry(c, 30, 0.016, 8, false);
  }, []);
  useEffect(
    () => () => {
      hose.dispose();
      cable.dispose();
    },
    [hose, cable],
  );

  useFrame((_, delta) => {
    const s = engine.getState();
    // The engine ticks (and the canvas redraws) while the pump strokes the valve.
    if (fan.current && s.eh.motorRunning) fan.current.rotation.x += Math.min(delta, 0.05) * 30;
    if (needle.current) needle.current.rotation.z = Math.PI * 0.75 - (s.eh.pressure / (EH.workingPressure * 1.4)) * Math.PI * 1.5;
  });

  return (
    <>
      <Pick id="power-unit" {...pick}>
        {/* oil reservoir */}
        <RoundedBox args={[0.95, 0.42, 0.32]} radius={0.04} smoothness={3} position={[1.7, -0.08, PZ]} material={mats.gasTank} />
        {/* sight glass */}
        <mesh position={[1.4, -0.08, PZ + 0.165]} material={mats.knob}>
          <boxGeometry args={[0.06, 0.28, 0.01]} />
        </mesh>
        <mesh position={[1.4, -0.12, PZ + 0.172]} material={mats.oil}>
          <boxGeometry args={[0.04, 0.18, 0.01]} />
        </mesh>
        {/* motor with cooling fins and fan cover */}
        <group position={[1.47, 0.27, PZ]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.motor}>
            <cylinderGeometry args={[0.13, 0.13, 0.44, 32]} />
          </mesh>
          {[-0.14, -0.07, 0, 0.07, 0.14].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.motor}>
              <cylinderGeometry args={[0.145, 0.145, 0.02, 32]} />
            </mesh>
          ))}
          <group ref={fan} position={[-0.235, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={mats.handwheel}>
              <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
            </mesh>
            <mesh position={[-0.018, 0, 0]} material={mats.indicatorStripe}>
              <boxGeometry args={[0.005, 0.2, 0.025]} />
            </mesh>
          </group>
        </group>
        {/* pump and manifold */}
        <RoundedBox args={[0.22, 0.2, 0.22]} radius={0.02} smoothness={2} position={[1.9, 0.23, PZ]} material={mats.pumpBody} />
        {/* dump solenoid valve */}
        <mesh position={[2.08, 0.24, PZ + 0.04]} material={mats.switchBody}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 20]} />
        </mesh>
        <mesh position={[2.08, 0.33, PZ + 0.04]} material={mats.gaugeNeedle}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 16]} />
        </mesh>
        {/* pressure gauge on the reservoir face */}
        <group position={[2.0, -0.06, PZ + 0.17]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.bezel}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 32]} />
          </mesh>
          <mesh position={[0, 0, 0.011]} material={mats.gaugeFace}>
            <circleGeometry args={[0.078, 32]} />
          </mesh>
          <group ref={needle} position={[0, 0, 0.016]}>
            <mesh position={[0, 0.03, 0]} material={mats.gaugeNeedle}>
              <boxGeometry args={[0.008, 0.06, 0.003]} />
            </mesh>
          </group>
        </group>
        <mesh geometry={hose} material={mats.knob} />
      </Pick>

      <Pick id="controller" {...pick}>
        <RoundedBox args={[0.42, 0.52, 0.34]} radius={0.04} smoothness={3} position={[2.68, -0.02, PZ]} material={mats.controlCover} />
        <mesh position={[2.68, 0.06, PZ + 0.171]} material={mats.knob}>
          <planeGeometry args={[0.3, 0.23]} />
        </mesh>
        <ControllerDisplay position={[2.68, 0.06, PZ + 0.173]} />
        {[-0.08, 0.08].map((dx, i) => (
          <mesh key={dx} position={[2.68 + dx, -0.17, PZ + 0.19]} rotation={[Math.PI / 2, 0, 0]} material={i ? mats.selectorKnob : mats.knob}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 20]} />
          </mesh>
        ))}
        {/* cable entries */}
        {[-0.1, 0.1].map((dx) => (
          <mesh key={dx} position={[2.68 + dx, -0.3, PZ]} material={mats.cable}>
            <cylinderGeometry args={[0.03, 0.03, 0.06, 14]} />
          </mesh>
        ))}
        <mesh geometry={cable} material={mats.cable} />
      </Pick>

      {showLabels && (
        <>
          <Label position={[1.47, 0.62, PZ]}>Motor and pump</Label>
          <Label position={[2.68, 0.45, PZ]}>Integral controller</Label>
        </>
      )}
    </>
  );
}
