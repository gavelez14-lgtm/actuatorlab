/**
 * SimulationEngine: framework-independent, time-based actuator simulation.
 *
 * The engine core owns the clock, snapshots, notices and the generic
 * commands (play, speed, mode, cutaway, seek, configuration, supply switch).
 * How an actuator produces motion lives in its family module under
 * ./families: chamber conditions, forces, the physics step, open/close
 * handling, family-only commands and status text.
 *
 * - Integrates stroke from real elapsed time (scaled by `speed`), never from frame count.
 * - Fail action comes from the physics (spring force, stored gas, dump valve), not from scripts.
 *
 * The renderer reads `getState()` (a live, mutable object) every frame.
 * React UI subscribes via `subscribe` + `getSnapshot`, which updates at a
 * throttled rate during motion to avoid re-rendering on every frame.
 */
import { MODEL, strokeFromValvePosition, valvePositionFromStroke } from "./model";
import { ELECTRIC } from "./electric";
import { GAS } from "./gas";
import { behaviorFor, type FamilyBehavior, type FamilyContext } from "./families";
import { AUTO_CYCLE_DWELL } from "./families/shared";
import type { ActuatorConfiguration, SimulationCommand, SimulationState, VisualizationMode } from "./types";

const UI_EMIT_INTERVAL = 1 / 15; // seconds
const MAX_FRAME_DT = 0.25; // clamp long frames (tab switches) without starving slow devices

export const DEFAULT_CONFIG: ActuatorConfiguration = {
  family: "pneumatic-scotch-yoke",
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

function normaliseConfig(raw: ActuatorConfiguration): ActuatorConfiguration {
  const fam = behaviorFor(raw.family);
  const c = fam.normalise ? fam.normalise(raw) : raw;
  if (c.actionType === "double-acting") return { ...c, failPosition: "fail-in-place" };
  if (c.failPosition === "fail-in-place") return { ...c, failPosition: "fail-closed" };
  return c;
}

/** Recompute fields that depend only on stroke, configuration and commands. */
function derive(s: SimulationState) {
  s.position = valvePositionFromStroke(s.config, s.stroke);
  s.outputAngle = s.stroke * 90;
  s.targetPosition = s.commandedStroke === null ? null : valvePositionFromStroke(s.config, s.commandedStroke);
  [s.chamberA, s.chamberB] = behaviorFor(s.config.family).chambers(s);
}

export function createInitialState(config: Partial<ActuatorConfiguration> = {}): SimulationState {
  const cfg = normaliseConfig({ ...DEFAULT_CONFIG, ...config });
  const stroke = 0; // start at stroke 0: the spring end for spring return
  const state: SimulationState = {
    config: cfg,
    stroke,
    position: valvePositionFromStroke(cfg, stroke),
    targetPosition: null,
    outputAngle: 0,
    velocity: 0,
    direction: "stopped",
    supplyPressure: behaviorFor(cfg.family).initialPressure ?? MODEL.pressureDefault,
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
    explode: 0,
    isolate: false,
    status: "",
    notice: null,
    time: 0,
    electric: {
      selector: "remote",
      handMode: false,
      handDir: 0,
      torqueLimit: ELECTRIC.torqueLimitDefault,
      obstruction: false,
      tripped: null,
      motorRunning: false,
      outputTorque: 0,
      closeOnTorque: true,
      seated: false,
    },
    gas: {
      pipeline: GAS.pipelineDefault,
      pipelineSet: GAS.pipelineDefault,
      tank: GAS.pipelineDefault,
      rate: 0,
      ruptured: false,
      armed: true,
      setPoint: GAS.rateDefault,
      overFor: 0,
      tripped: false,
      manual: false,
      lowSet: GAS.lowDefault,
      flow: GAS.flowDefault,
      tripCause: null,
      pumpDir: 0,
      pumpPhase: 0,
    },
    eh: { demand: null, esd: false, pst: "idle", pstStart: 0, stuck: false, motorRunning: false, dumping: false, pressure: 0 },
    paint: "graphite",
  };
  derive(state);
  return state;
}

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
    this.family.forces(this.s);
    this.updateStatus();
    this.snapshot = this.copy();
  }

  private get family(): FamilyBehavior {
    return behaviorFor(this.s.config.family);
  }

  /** Services handed to the family module for the current state. */
  private ctx(): FamilyContext {
    const s = this.s;
    return {
      s,
      derive: () => derive(s),
      forces: () => this.family.forces(s),
      flash: (m) => this.flash(m),
      // Discrete events (stall, trip, PST result) emit mid-step: refresh the status first.
      emit: () => {
        this.updateStatus();
        this.emit();
      },
      command: (kind, silent = false) => this.family.command(this.ctx(), kind, silent),
      cycle: (dt, idle, fire) => {
        if (s.autoCycle && idle) {
          this.dwell += dt;
          if (this.dwell >= AUTO_CYCLE_DWELL) {
            this.dwell = 0;
            fire();
          }
        } else {
          this.dwell = 0;
        }
      },
    };
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
    if (this.s.playing && dt > 0) {
      this.s.time += dt * this.s.speed;
      this.family.step(this.ctx(), dt * this.s.speed);
      this.updateStatus();
    }
    const changed = before !== this.s.stroke || wasMoving !== this.s.airFlowing;
    if (changed || this.s.airFlowing) this.tickListeners.forEach((f) => f());
    this.emitAccumulator += dt;
    if (changed) this.dirty = true;
    const flowFlip = wasMoving !== this.s.airFlowing;
    if (this.family.liveUi?.(this.s) && this.emitAccumulator >= UI_EMIT_INTERVAL) {
      this.dirty = false;
      this.emit();
      return;
    }
    if (this.dirty && (flowFlip || !changed || this.emitAccumulator >= UI_EMIT_INTERVAL)) {
      this.dirty = false;
      this.emit();
    }
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
    const fam = this.family;
    const ctx = this.ctx();
    if (fam.handle?.(ctx, cmd)) return this.afterCommand();
    switch (cmd.type) {
      case "open":
      case "close":
        fam.command(ctx, cmd.type, false);
        break;
      case "reset": {
        const keep = { paint: s.paint, config: s.config, mode: s.mode, cutaway: s.cutaway, housingOpacity: s.housingOpacity, showLabels: s.showLabels, speed: s.speed, selectedComponent: s.selectedComponent, explode: s.explode, isolate: s.isolate };
        this.s = { ...createInitialState(s.config), ...keep };
        this.s.stroke = 0; // spring return rests at its spring end, the fail position
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
        this.flash(fam.supplyNotice(s, cmd.available));
        break;
      case "set-pressure":
        fam.setPressure(s, cmd.bar);
        break;
      case "set-config":
        // Keep the mechanical stroke and re-derive the valve position.
        s.config = normaliseConfig({ ...s.config, ...cmd.config });
        s.commandedStroke = null;
        derive(s);
        break;
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
      case "set-explode":
        s.explode = Math.min(1, Math.max(0, cmd.value));
        break;
      case "set-isolate":
        s.isolate = cmd.value;
        break;
      case "select":
        s.selectedComponent = cmd.id;
        break;
      case "set-paint":
        s.paint = cmd.value;
        break;
      case "stop":
        s.commandedStroke = null;
        derive(s);
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
      default:
        // A family-only command sent to a family that does not have it: ignore.
        break;
    }
    this.afterCommand();
  }

  private afterCommand() {
    this.family.forces(this.s);
    this.updateStatus();
    this.emit();
  }

  private updateStatus() {
    this.s.status = this.family.status(this.s);
  }

  private copy(): SimulationState {
    const s = this.s;
    return { ...s, config: { ...s.config }, torque: { ...s.torque }, electric: { ...s.electric }, gas: { ...s.gas }, eh: { ...s.eh } };
  }

  private emit() {
    this.emitAccumulator = 0;
    this.snapshot = this.copy();
    this.listeners.forEach((f) => f());
  }
}
