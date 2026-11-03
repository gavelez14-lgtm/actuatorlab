"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { componentInfo } from "@/data/components";
import { mechanismFor, type MechanismKind } from "@/lib/sim/mechanisms";
import type { ComponentId, VisualizationMode } from "@/lib/sim/types";
import { useEngine, useSimSelector } from "@/components/sim/SimulationProvider";
import { usePrefersReducedMotion, useWebGLSupport } from "@/lib/hooks";
import { ActuatorModel } from "./ActuatorModel";
import { RackPinionModel } from "./RackPinionModel";
import { ElectricPartTurnModel } from "./ElectricPartTurnModel";
import { applyCutaway, applyHighlight, createMaterials, disposeMaterials } from "./materials";
import { WebGLFallback } from "./WebGLFallback";

const DEFAULT_TARGET = new THREE.Vector3(-0.15, -0.5, -0.35);
const DEFAULT_DIR = new THREE.Vector3(0.62, 0.36, 0.7).normalize();
const DEFAULT_DISTANCE = 7.4;

type View = { target: [number, number, number]; dir: [number, number, number]; distance: number };

const SCOTCH_YOKE_VIEWS: Record<VisualizationMode, View> = {
  normal: { target: [-0.15, -0.5, -0.35], dir: [0.62, 0.36, 0.7], distance: 7.4 },
  cutaway: { target: [-0.15, -0.3, -0.45], dir: [0.4, 0.82, 0.42], distance: 6.8 },
  mechanical: { target: [0.2, 0.05, -0.45], dir: [0.3, 0.82, 0.5], distance: 4.6 },
  energy: { target: [0.2, -0.15, -0.5], dir: [0.32, 0.5, 0.8], distance: 6.6 },
  engineering: { target: [-0.15, -0.5, -0.35], dir: [0.62, 0.36, 0.7], distance: 7.4 },
};

/** The rack and pinion is about 40% of the Scotch yoke's length, so views sit closer. */
const RACK_PINION_VIEWS: Record<VisualizationMode, View> = {
  normal: { target: [0, -0.55, 0], dir: [0.55, 0.38, 0.74], distance: 5.4 },
  cutaway: { target: [0, -0.25, 0], dir: [0.3, 0.84, 0.45], distance: 4.6 },
  mechanical: { target: [0, 0.05, 0], dir: [0.22, 0.88, 0.42], distance: 2.9 },
  energy: { target: [0, -0.1, 0.2], dir: [0.25, 0.45, 0.86], distance: 4.4 },
  engineering: { target: [0, -0.55, 0], dir: [0.55, 0.38, 0.74], distance: 5.4 },
};

/** Electric part-turn: compact gearcase with the motor out to the right. */
const ELECTRIC_VIEWS: Record<VisualizationMode, View> = {
  normal: { target: [0.15, -0.45, 0], dir: [0.5, 0.4, 0.77], distance: 4.9 },
  cutaway: { target: [0.1, -0.15, -0.1], dir: [0.3, 0.82, 0.48], distance: 4.0 },
  mechanical: { target: [0.1, 0.08, -0.2], dir: [0.3, 0.86, 0.42], distance: 2.7 },
  energy: { target: [0.3, -0.05, -0.3], dir: [0.45, 0.45, 0.77], distance: 4.6 },
  engineering: { target: [0.15, -0.45, 0], dir: [0.5, 0.4, 0.77], distance: 4.9 },
};

function viewsFor(kind: MechanismKind) {
  if (kind === "worm-gear") return ELECTRIC_VIEWS;
  return kind === "rack-pinion" ? RACK_PINION_VIEWS : SCOTCH_YOKE_VIEWS;
}

/**
 * Distance multiplier so the model fits narrow (portrait) viewports too:
 * presets are tuned for a ~1.6 aspect; pull back proportionally below that.
 */
function frameScale(camera: THREE.Camera, compact: boolean) {
  const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
  return (compact ? 0.96 : 1) * Math.max(1, 1.45 / aspect);
}

/** Re-render on demand whenever the engine advances. */
function EngineInvalidator() {
  const { engine } = useEngine();
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => engine.onTick(() => invalidate()), [engine, invalidate]);
  return null;
}

function CameraRig({
  controls,
  root,
  compact,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  root: React.RefObject<THREE.Group | null>;
  compact: boolean;
}) {
  const { camera: cameraApi } = useEngine();
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const reduced = usePrefersReducedMotion();
  const anim = useRef<{
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
  } | null>(null);

  const { engine: eng } = useEngine();
  useEffect(() => {
    const kind = () => mechanismFor(eng.getState().config.family);
    const flyTo = (target: THREE.Vector3, position: THREE.Vector3) => {
      const c = controls.current;
      if (!c) return;
      if (reduced) {
        c.target.copy(target);
        camera.position.copy(position);
        c.update();
        invalidate();
        return;
      }
      anim.current = {
        fromPos: camera.position.clone(),
        toPos: position,
        fromTarget: c.target.clone(),
        toTarget: target,
        t: 0,
      };
      invalidate();
    };
    const fromView = (target: THREE.Vector3, dir: THREE.Vector3, distance: number) =>
      flyTo(target.clone(), target.clone().add(dir.clone().normalize().multiplyScalar(distance * frameScale(camera, compact))));

    cameraApi.current = {
      reset: () => {
        const v = viewsFor(kind()).normal;
        fromView(new THREE.Vector3(...v.target), new THREE.Vector3(...v.dir), v.distance);
      },
      fit: () => {
        const c = controls.current;
        if (!c || !root.current) return;
        const box = new THREE.Box3().setFromObject(root.current);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
        const aspect = (camera as THREE.PerspectiveCamera).aspect || 1;
        const fitFov = aspect < 1 ? 2 * Math.atan(Math.tan(fov / 2) * aspect) : fov;
        const distance = (sphere.radius / Math.sin(fitFov / 2)) * 0.92;
        const dir = camera.position.clone().sub(c.target).normalize();
        flyTo(sphere.center.clone(), sphere.center.clone().add(dir.multiplyScalar(distance)));
      },
      focus: (id: ComponentId) => {
        const info = componentInfo(kind(), id);
        const c = controls.current;
        if (!info || !c) return;
        const dir = camera.position.clone().sub(c.target).normalize();
        fromView(new THREE.Vector3(...info.focus), dir, info.distance);
      },
      preset: (mode: VisualizationMode, scale = 1) => {
        const v = viewsFor(kind())[mode];
        fromView(new THREE.Vector3(...v.target), new THREE.Vector3(...v.dir), v.distance * scale);
      },
    };
    return () => {
      cameraApi.current = null;
    };
  }, [camera, cameraApi, controls, root, invalidate, reduced, compact, eng]);

  // Start in the preset view of the initial mode (e.g. deep-linked ?mode=mechanical).
  const { engine } = useEngine();
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const mode = engine.getState().mode;
    const c = controls.current;
    if (!c) return;
    const v = viewsFor(mechanismFor(engine.getState().config.family))[mode];
    const target = new THREE.Vector3(...v.target);
    c.target.copy(target);
    camera.position.copy(target.clone().add(new THREE.Vector3(...v.dir).normalize().multiplyScalar(v.distance * frameScale(camera, compact))));
    c.update();
    invalidate();
  }, [engine, camera, controls, compact, invalidate]);

  // Any user orbit cancels a fly-to so the camera never fights the user.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => (anim.current = null);
    c.addEventListener("start", cancel);
    return () => c.removeEventListener("start", cancel);
  });

  useFrame((_, delta) => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    a.t = Math.min(1, a.t + delta / 0.85);
    const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
    camera.position.lerpVectors(a.fromPos, a.toPos, e);
    c.target.lerpVectors(a.fromTarget, a.toTarget, e);
    c.update();
    if (a.t >= 1) anim.current = null;
    else invalidate();
  });

  return null;
}

function Scene({ compact, interactive }: { compact: boolean; interactive: boolean }) {
  const { engine } = useEngine();
  const selected = useSimSelector((s) => s.selectedComponent);
  const cutaway = useSimSelector((s) => s.cutaway);
  const opacity = useSimSelector((s) => s.housingOpacity);
  const actionType = useSimSelector((s) => s.config.actionType);
  const mechanism = useSimSelector((s) => mechanismFor(s.config.family));
  const [hovered, setHovered] = useState<ComponentId | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl>(null);
  const root = useRef<THREE.Group>(null);

  const mats = useMemo(() => createMaterials(), []);
  useEffect(() => () => disposeMaterials(mats), [mats]);
  useEffect(() => {
    applyHighlight(mats, selected, interactive ? hovered : null);
    invalidate();
  }, [mats, selected, hovered, interactive, invalidate]);
  useEffect(() => {
    applyCutaway(mats, cutaway, opacity);
    invalidate();
  }, [mats, cutaway, opacity, invalidate]);
  useEffect(() => {
    if (!interactive) return;
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, interactive]);

  return (
    <>
      <EngineInvalidator />
      <CameraRig controls={controls} root={root} compact={compact} />
      <OrbitControls
        ref={controls}
        makeDefault
        target={DEFAULT_TARGET}
        enableDamping={false}
        minDistance={1.2}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.62}
        enablePan={interactive}
        enableZoom={interactive}
      />

      <hemisphereLight args={["#e6ecf2", "#23272d", 0.9]} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} />
      <directionalLight position={[-5, 3, -4]} intensity={0.45} />
      <directionalLight position={[-1, 4, -7]} intensity={1.1} color="#e8eef8" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[5, 0.5, -2]} rotation-y={-Math.PI / 2} scale={[6, 1.5, 1]} />
        <Lightformer form="ring" intensity={0.6} position={[0, -3, 0]} scale={4} />
      </Environment>

      {mechanism === "worm-gear" ? (
        <ElectricPartTurnModel
          mats={mats}
          rootRef={root}
          onSelect={(id) => interactive && engine.dispatch({ type: "select", id })}
          onHover={(id) => interactive && setHovered(id)}
        />
      ) : mechanism === "rack-pinion" ? (
        <RackPinionModel
          mats={mats}
          rootRef={root}
          onSelect={(id) => interactive && engine.dispatch({ type: "select", id })}
          onHover={(id) => interactive && setHovered(id)}
        />
      ) : (
        <ActuatorModel
          mats={mats}
          rootRef={root}
          onSelect={(id) => interactive && engine.dispatch({ type: "select", id })}
          onHover={(id) => interactive && setHovered(id)}
        />
      )}

      <ContactShadows key={`${mechanism}-${actionType}`} position={[0, -2.04, -0.3]} scale={10} blur={2.8} opacity={0.7} far={3.2} frames={1} resolution={1024} color="#000000" />

    </>
  );
}

export interface SimViewportProps {
  /** Compact embeds (dashboard, lessons) disable zoom/pan and selection. */
  compact?: boolean;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SimViewport({ compact = false, interactive = true, className, ariaLabel }: SimViewportProps) {
  const webgl = useWebGLSupport();
  const { engine } = useEngine();
  const down = useRef<{ x: number; y: number } | null>(null);
  const [contextLost, setContextLost] = useState(false);

  if (webgl === null) return <div className={className} aria-busy="true" />;
  if (!webgl || contextLost) return <WebGLFallback className={className} reason={contextLost ? "lost" : "unsupported"} />;

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? "Interactive 3D model of a Scotch yoke actuator mounted on a ball valve. Drag to orbit, scroll to zoom."}
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 38, near: 0.05, far: 100, position: DEFAULT_TARGET.clone().add(DEFAULT_DIR.clone().multiplyScalar(DEFAULT_DISTANCE * (compact ? 0.96 : 1))).toArray() }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.domElement.addEventListener("webglcontextlost", (ev) => {
            ev.preventDefault();
            setContextLost(true);
          });
        }}
        onPointerMissed={(e) => {
          if (!interactive || !down.current) return;
          const moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y);
          if (moved < 4) engine.dispatch({ type: "select", id: null });
        }}
      >
        <Suspense fallback={null}>
          <Scene compact={compact} interactive={interactive} />
        </Suspense>
      </Canvas>
    </div>
  );
}
