/**
 * SimulationEngine: framework-independent, time-based actuator simulation.
 *
 * - Integrates stroke from real elapsed time (scaled by `speed`), never from frame count.
 * - Velocity is smoothed toward a force-derived target, so reversing, pausing and
 *   resuming never cause position jumps.
 * - Spring-return fail action comes from the spring force in the model, not from
 *   a scripted animation: when air is removed the only remaining active force is
 *   the spring, and it drives the mechanism to the spring end.
 * - Double-acting has no stored energy: remove supply and there is no driving force.
 *
 * The renderer reads `getState()` (a live, mutable object) every frame.
 * React UI subscribes via `subscribe` + `getSnapshot`, which updates at a
 * throttled rate during motion to avoid re-rendering on every frame.
 */
import { MODEL, computeTorques, strokeFromValvePosition, valvePositionFromStroke } from "./model";
import type {
  ActuatorConfiguration,
  ChamberCondition,
  SimulationCommand,
  SimulationState,
  VisualizationMode,
} from "./types";

const UI_EMIT_INTERVAL = 1 / 15; // seconds
const MAX_FRAME_DT = 0.25; // clamp long frames (tab switches) without starving slow devices
const VELOCITY_RESPONSE = 7; // 1/s, how quickly velocity tracks its target
const END_EPS = 1e-4;
const AUTO_CYCLE_DWELL = 1.1; // seconds (simulation time)

export const DEFAULT_CONFIG: ActuatorConfiguration = {
  family: "cp",
  actionType: "spring-return",
  failPosition: "fail-closed",
};

const MODE_PRESETS: Record<VisualizationMode, Partial<SimulationState>> = {
  normal: { cutaway: "solid", showLabels: false },
  cutaway: { cutaway: "section", showLabels: false },
  mechanical: { cutaway: "section", showLabels: true },
  energy: { cutaway: "ghost", housingOpacity: 0.22, showLabels: false },
  engineering: { cutaway: "ghost", housingOpacity: 0.3, showLabels: false },
};

function normaliseConfig(c: ActuatorConfiguration): ActuatorConfiguration {
  if (c.actionType === "double-acting") return { ...c, failPosition: "fail-in-place" };
  if (c.failPosition === "fail-in-place") return { ...c, failPosition: "fail-closed" };
  return c;
}

export function createInitialState(config: Partial<ActuatorConfiguration> = {}): SimulationState {
  const cfg = normaliseConfig({ ...DEFAULT_CONFIG, ...config });
  // Start at the closed position. For spring-return this is also the spring end
  // in fail-closed; in fail-open the spring end is OPEN, so start there instead
  // (the spring would hold it there with no command anyway).
  const stroke = 0;
  const state: SimulationState = {
    config: cfg,
    stroke,
    position: valvePositionFromStroke(cfg, stroke),
    targetPosition: null,
    outputAngle: 0,
    velocity: 0,
    direction: "stopped",
    supplyPressure: MODEL.pressureDefault,
    supplyAvailable: true,
    commandedStroke: null,
    chamberA: "idle",
    chamberB: "idle",
    airFlowing: false,
    torque: { air: 0, spring: 0, valveDemand: 0, net: 0 },
    stalled: false,
    playing: true,
    speed: 1,
    autoCycle: false,
    mode: "normal",
    cutaway: "solid",
    housingOpacity: 1,
    showLabels: false,
    selectedComponent: null,
    status: "",
    notice: null,
    time: 0,
  };
  derive(state);
  return state;
}

/** Recompute derived fields that depend only on current stroke/config/commands. */
function derive(s: SimulationState) {
  const { config } = s;
  s.position = valvePositionFromStroke(config, s.stroke);
  s.outputAngle = s.stroke * 90;
  s.targetPosition =
    s.commandedStroke === null ? null : valvePositionFromStroke(config, s.commandedStroke);

  // Chamber conditions follow the control signal and the supply.
  let a: ChamberCondition = "idle";
  let b: ChamberCondition = "idle";
  if (config.actionType === "double-acting") {
    if (s.supplyAvailable && s.commandedStroke !== null) {
      a = s.commandedStroke === 1 ? "supply" : "exhaust";
      b = s.commandedStroke === 1 ? "exhaust" : "supply";
    }
  } else {
    a = s.supplyAvailable && s.commandedStroke === 1 ? "supply" : "exhaust";
    b = "atmosphere";
  }
  s.chamberA = a;
  s.chamberB = b;
}

function pressures(s: SimulationState) {
  const p = s.supplyPressure;
  return {
    pA: s.chamberA === "supply" ? p : 0,
    pB: s.chamberB === "supply" ? p : 0,
  };
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export class SimulationEngine {
  private s: SimulationState;
  private snapshot: SimulationState;
  private listeners = new Set<() => void>();
  private tickListeners = new Set<() => void>();
  private raf: number | null = null;
  private lastTs: number | null = null;
  private emitAccumulator = 0;
  private dirty = false;
  private dwell = 0;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private speedBeforeMechanical: number | null = null;

  constructor(config: Partial<ActuatorConfiguration> = {}) {
    this.s = createInitialState(config);
    this.updateForces();
    this.updateStatus();
    this.snapshot = this.copy();
  }

  /** Live mutable state for per-frame rendering. Do not mutate from outside. */
  getState(): Readonly<SimulationState> {
    return this.s;
  }

  /** Immutable snapshot for React (stable identity between emits). */
  getSnapshot = (): SimulationState => this.snapshot;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  /** Called after each simulation step that changed something visible. */
  onTick(fn: () => void): () => void {
    this.tickListeners.add(fn);
    return () => this.tickListeners.delete(fn);
  }

  /** Begin the real-time loop (browser only). */
  start() {
    if (this.raf !== null || typeof window === "undefined") return;
    const loop = (ts: number) => {
      const dt = this.lastTs === null ? 0 : (ts - this.lastTs) / 1000;
      this.lastTs = ts;
      this.advance(dt);
      this.raf = window.requestAnimationFrame(loop);
    };
    this.raf = window.requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf !== null) window.cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastTs = null;
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  /** Advance by real seconds. Exposed for tests and for non-rAF hosts. */
  advance(realDt: number) {
    const dt = Math.min(Math.max(realDt, 0), MAX_FRAME_DT);
    const before = this.s.stroke;
    const wasMoving = this.s.airFlowing;
    if (this.s.playing && dt > 0) this.step(dt * this.s.speed);
    const changed = before !== this.s.stroke || wasMoving !== this.s.airFlowing;
    if (changed || this.s.airFlowing) this.tickListeners.forEach((f) => f());
    this.emitAccumulator += dt;
    if (changed) this.dirty = true;
    const flowFlip = wasMoving !== this.s.airFlowing;
    if (this.dirty && (flowFlip || !changed || this.emitAccumulator >= UI_EMIT_INTERVAL)) {
      this.dirty = false;
      this.emit();
    }
  }

  /** One physics step of `dt` simulated seconds. */
  private step(dt: number) {
    const s = this.s;
    s.time += dt;
    derive(s);
    const f = this.updateForces();

    // Valve demand behaves like friction: it opposes motion and must be
    // exceeded before anything moves.
    const excess = Math.abs(f.active) - f.demand;
    let dir = 0;
    if (excess > 0) dir = Math.sign(f.active);
    const atEnd = (d: number) => (d > 0 ? s.stroke >= 1 - END_EPS : s.stroke <= END_EPS);

    let vTarget = 0;
    if (dir !== 0 && !atEnd(dir)) {
      const vmax = 1 / MODEL.nominalStrokeTime;
      const margin = Math.min(1.25, 0.35 + 0.65 * Math.sqrt(excess / MODEL.referenceMargin));
      const distToEnd = dir > 0 ? 1 - s.stroke : s.stroke;
      const cushion = 0.3 + 0.7 * smoothstep(0, 0.09, distToEnd);
      vTarget = dir * vmax * margin * cushion;
    }

    const prevStalled = s.stalled;
    s.stalled = dir === 0 && Math.abs(f.active) > 1e-6 && !atEnd(Math.sign(f.active)) && s.supplyAvailable;

    s.velocity += (vTarget - s.velocity) * (1 - Math.exp(-dt * VELOCITY_RESPONSE));
    if (Math.abs(s.velocity) < 1e-4 && vTarget === 0) s.velocity = 0;

    s.stroke += s.velocity * dt;
    if (s.stroke >= 1) {
      s.stroke = 1;
      if (s.velocity > 0) s.velocity = 0;
    } else if (s.stroke <= 0) {
      s.stroke = 0;
      if (s.velocity < 0) s.velocity = 0;
    }

    derive(s);
    s.airFlowing = Math.abs(s.velocity) > 0.004;
    const valveVel = valvePositionFromStroke(s.config, 1) > 0.5 ? s.velocity : -s.velocity;
    s.direction = !s.airFlowing ? "stopped" : valveVel > 0 ? "opening" : "closing";

    // Auto-cycle: dwell at an end, then command the opposite end.
    if (s.autoCycle && !s.airFlowing) {
      this.dwell += dt;
      if (this.dwell >= AUTO_CYCLE_DWELL) {
        this.dwell = 0;
        const open = s.position < 0.5;
        this.command(open ? "open" : "close", true);
      }
    } else {
      this.dwell = 0;
    }

    if (prevStalled !== s.stalled) this.emit();
    this.updateStatus();
  }

  private updateForces() {
    const s = this.s;
    const { pA, pB } = pressures(s);
    const f = computeTorques({ config: s.config, stroke: s.stroke, pressure: s.supplyPressure, pA, pB });
    s.torque = {
      air: f.air,
      spring: f.spring,
      valveDemand: f.demand,
      net: Math.abs(f.active) - f.demand,
    };
    return f;
  }

  private command(kind: "open" | "close", silent = false) {
    const s = this.s;
    const targetStroke = strokeFromValvePosition(s.config, kind === "open" ? 1 : 0) as 0 | 1;
    s.commandedStroke = targetStroke;
    derive(s);
    if (silent) return;

    const needsAir =
      s.config.actionType === "double-acting" || targetStroke === 1; // spring-return: stroke 1 is the air stroke
    if (needsAir && !s.supplyAvailable) {
      this.flash(
        s.config.actionType === "double-acting"
          ? `${kind === "open" ? "Open" : "Close"} signal recorded, but there is no supply. A double-acting actuator has no stored energy, so it stays put until supply returns.`
          : `${kind === "open" ? "Open" : "Close"} signal recorded, but there is no supply. The spring holds the actuator at its fail position until supply returns.`,
      );
    } else if (s.config.actionType === "spring-return" && targetStroke === 0) {
      this.flash("Solenoid de-energised: the cylinder vents and the spring drives the stroke.");
    }
    if (!s.playing) this.flash("Simulation is paused. Press Play to see the command execute.");
  }

  private flash(message: string) {
    this.s.notice = message;
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.s.notice = null;
      this.emit();
    }, 6000);
  }

  dispatch(cmd: SimulationCommand) {
    const s = this.s;
    switch (cmd.type) {
      case "open":
      case "close":
        this.command(cmd.type);
        break;
      case "reset": {
        const keep = { config: s.config, mode: s.mode, cutaway: s.cutaway, housingOpacity: s.housingOpacity, showLabels: s.showLabels, speed: s.speed, selectedComponent: s.selectedComponent };
        this.s = { ...createInitialState(s.config), ...keep };
        // Spring-return rests at its spring end; that is the fail position.
        this.s.stroke = 0;
        derive(this.s);
        this.dwell = 0;
        break;
      }
      case "play":
        s.playing = true;
        break;
      case "pause":
        s.playing = false;
        break;
      case "toggle-play":
        s.playing = !s.playing;
        break;
      case "set-speed":
        s.speed = Math.min(4, Math.max(0.1, cmd.speed));
        this.speedBeforeMechanical = null;
        break;
      case "set-auto-cycle":
        s.autoCycle = cmd.value;
        this.dwell = AUTO_CYCLE_DWELL; // start promptly
        if (cmd.value && !s.playing) s.playing = true;
        break;
      case "set-supply":
        s.supplyAvailable = cmd.available;
        derive(s);
        if (!cmd.available) {
          this.flash(
            s.config.actionType === "spring-return"
              ? "Supply lost. The cylinder vents and the stored spring energy drives the actuator to its fail position."
              : "Supply lost. Both chambers lose motive pressure; with no stored energy the actuator stops where it is.",
          );
        } else {
          this.flash(
            s.commandedStroke === null
              ? "Supply restored. No command is active, so nothing moves."
              : "Supply restored. The actuator responds to the control signal that is still active.",
          );
        }
        break;
      case "set-pressure":
        s.supplyPressure = Math.min(MODEL.pressureMax, Math.max(MODEL.pressureMin, cmd.bar));
        break;
      case "set-config": {
        const next = normaliseConfig({ ...s.config, ...cmd.config });
        // Preserve the VALVE position across a coupling change only if the
        // mechanism is mid-air; otherwise keep the mechanical stroke. Here we
        // keep stroke (mechanical state) and re-derive the valve position.
        s.config = next;
        s.commandedStroke = null;
        derive(s);
        break;
      }
      case "set-mode": {
        const prev = s.mode;
        s.mode = cmd.mode;
        Object.assign(s, MODE_PRESETS[cmd.mode]);
        if (cmd.mode === "mechanical" && prev !== "mechanical") {
          this.speedBeforeMechanical = s.speed;
          s.speed = 0.35;
        } else if (prev === "mechanical" && cmd.mode !== "mechanical" && this.speedBeforeMechanical !== null) {
          s.speed = this.speedBeforeMechanical;
          this.speedBeforeMechanical = null;
        }
        if (cmd.mode === "normal") s.housingOpacity = 1;
        break;
      }
      case "set-cutaway":
        s.cutaway = cmd.style;
        if (cmd.style === "ghost" && s.housingOpacity > 0.6) s.housingOpacity = 0.3;
        break;
      case "set-housing-opacity":
        s.housingOpacity = Math.min(1, Math.max(0.05, cmd.value));
        break;
      case "set-labels":
        s.showLabels = cmd.value;
        break;
      case "select":
        s.selectedComponent = cmd.id;
        break;
      case "seek":
        // Manual scrubbing is a teaching aid. It pauses the clock so the
        // physics does not immediately fight the user.
        s.playing = false;
        s.velocity = 0;
        s.stroke = strokeFromValvePosition(s.config, Math.min(1, Math.max(0, cmd.position)));
        derive(s);
        this.tickListeners.forEach((f) => f());
        break;
    }
    this.updateForces();
    this.updateStatus();
    this.emit();
  }

  private updateStatus() {
    const s = this.s;
    const sr = s.config.actionType === "spring-return";
    let msg: string;
    if (!s.playing) msg = `Paused at ${pct(s.position)} open.`;
    else if (s.airFlowing) {
      const verb = s.direction === "opening" ? "Opening" : "Closing";
      if (sr && s.chamberA !== "supply") msg = `${verb}: spring stroke. Cylinder air is exhausting while the spring extends.`;
      else if (sr) msg = `${verb}: air stroke. Air pressure drives the piston and compresses the spring.`;
      else msg = `${verb}: air drives the piston; the opposite chamber exhausts.`;
    } else if (s.stalled) {
      msg = `Stalled at ${pct(s.position)}: available torque does not exceed the load. Raise supply pressure (illustrative model).`;
    } else if (sr && !s.supplyAvailable) {
      msg = `Supply lost. Spring holds the valve ${s.config.failPosition === "fail-closed" ? "closed" : "open"} (fail position).`;
    } else if (!sr && !s.supplyAvailable) {
      msg = `Supply lost. No stored energy: the valve stays at ${pct(s.position)} (fail in place).`;
    } else if (s.commandedStroke === null) {
      msg = sr ? "At rest on the spring. Issue an Open or Close command." : "Idle. Issue an Open or Close command.";
    } else {
      msg = `Holding ${s.position > 0.5 ? "open" : "closed"}.${sr && s.chamberA === "supply" ? " Air pressure holds the spring compressed." : sr ? " The spring holds this position." : " Supply pressure holds the piston at its end stop."}`;
    }
    s.status = msg;
  }

  private copy(): SimulationState {
    const s = this.s;
    return { ...s, config: { ...s.config }, torque: { ...s.torque } };
  }

  private emit() {
    this.emitAccumulator = 0;
    this.snapshot = this.copy();
    this.listeners.forEach((f) => f());
  }
}
