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
import { ELECTRIC, MULTI_TURN, electricDemand, isElectric, isMultiTurn, torqueLimitValue } from "./electric";
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

function normaliseConfig(c: ActuatorConfiguration): ActuatorConfiguration {
  // Electric actuators have no spring and no coupling flip in this model.
  if (isElectric(c.family)) return { ...c, actionType: "double-acting", failPosition: "fail-in-place" };
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
    paint: "graphite",
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
  if (isElectric(config.family)) {
    // no air chambers
  } else if (config.actionType === "double-acting") {
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
    if (isElectric(s.config.family)) {
      // Fixed sub-steps so narrow events (wedge seating, a jam) are never
      // stepped over on slow devices: behaviour must not depend on frame rate.
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < n; i++) this.electricStep(dt / n);
      return;
    }
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

  /**
   * Electric part-turn: constant motor speed until a position limit, a torque
   * trip, a Stop, or loss of power. The self-locking worm holds position the
   * instant the motor stops. In hand mode the motor is declutched and only the
   * handwheel moves the output.
   */
  private electricStep(dt: number) {
    const s = this.s;
    const e = s.electric;
    const atEnd = (d: number) => (d > 0 ? s.stroke >= 1 - END_EPS : s.stroke <= END_EPS);
    let vTarget = 0;
    let running = false;
    const prevTrip = e.tripped;
    const multi = isMultiTurn(s.config.family);
    const strokeTime = multi ? MULTI_TURN.strokeTime : ELECTRIC.strokeTime;
    const handTime = multi ? MULTI_TURN.handStrokeTime : ELECTRIC.handStrokeTime;
    const prevSeated = e.seated;

    if (e.handMode) {
      if (e.handDir !== 0 && !atEnd(e.handDir)) {
        const [a, b] = ELECTRIC.obstructionWindow;
        const jammed = e.obstruction && e.handDir > 0 && s.position >= a && s.position <= b;
        if (!jammed) vTarget = e.handDir / handTime;
      }
    } else if (s.supplyAvailable && e.selector !== "stop" && s.commandedStroke !== null && !e.tripped && !(e.seated && s.commandedStroke === 0)) {
      const dir = s.commandedStroke === 1 ? 1 : -1;
      if (!atEnd(dir)) {
        const demand = electricDemand(s.position, e.obstruction, dir > 0, s.config.family);
        const closingIntoSeat = multi && dir < 0 && s.position < MULTI_TURN.wedgeZone;
        if (closingIntoSeat && !e.closeOnTorque && s.position <= MULTI_TURN.wedgeZone * 0.5) {
          // position-limit close: stop at the set position as the wedge touches
          s.stroke = 0;
          s.velocity = 0;
        } else if (demand > torqueLimitValue(e.torqueLimit)) {
          if (closingIntoSeat && e.closeOnTorque) {
            // torque-seated close: the wedge is driven home until torque reaches the limit
            e.seated = true;
            s.stroke = 0;
            s.velocity = 0;
          } else {
            e.tripped = dir > 0 ? "opening" : "closing";
          }
        } else {
          running = true;
          vTarget = dir / strokeTime;
        }
      }
    }

    // Motors accelerate quickly; the worm gear stops the output almost instantly.
    const response = vTarget !== 0 ? 18 : 45;
    s.velocity += (vTarget - s.velocity) * (1 - Math.exp(-dt * response));
    if (vTarget === 0 && Math.abs(s.velocity) < 1e-3) s.velocity = 0;
    s.stroke = Math.min(1, Math.max(0, s.stroke + s.velocity * dt));
    if ((s.stroke >= 1 && s.velocity > 0) || (s.stroke <= 0 && s.velocity < 0)) s.velocity = 0;

    derive(s);
    e.motorRunning = running;
    const demandNow = electricDemand(s.position, e.obstruction, s.velocity >= 0, s.config.family);
    e.outputTorque = running ? demandNow : (e.tripped && !prevTrip) || (e.seated && !prevSeated) ? torqueLimitValue(e.torqueLimit) : 0;
    s.torque = { air: 0, spring: 0, valveDemand: demandNow, net: torqueLimitValue(e.torqueLimit) - demandNow };
    s.stalled = false;
    s.airFlowing = Math.abs(s.velocity) > 0.004;
    s.direction = !s.airFlowing ? "stopped" : s.velocity > 0 ? "opening" : "closing";

    if (s.autoCycle && !s.airFlowing && !e.handMode) {
      this.dwell += dt;
      if (this.dwell >= AUTO_CYCLE_DWELL) {
        this.dwell = 0;
        e.tripped = null;
        this.command(s.position < 0.5 ? "open" : "close", true);
      }
    } else {
      this.dwell = 0;
    }

    if (prevTrip !== e.tripped || prevSeated !== e.seated) this.emit();
    this.updateStatus();
  }

  private updateForces() {
    const s = this.s;
    if (isElectric(s.config.family)) {
      const e = s.electric;
      const demand = electricDemand(s.position, e.obstruction, s.velocity >= 0, s.config.family);
      s.torque = { air: 0, spring: 0, valveDemand: demand, net: torqueLimitValue(e.torqueLimit) - demand };
      return { active: 0, air: 0, spring: 0, demand };
    }
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
    if (isElectric(s.config.family)) {
      const e = s.electric;
      if (!silent && e.selector === "stop") {
        this.flash("The local selector is at Stop, so commands are ignored. Turn it to Local or Remote.");
        return;
      }
      s.commandedStroke = targetStroke;
      e.tripped = null;
      if (targetStroke === 1) e.seated = false;
      derive(s);
      const source = e.selector === "local" ? "Local control" : "Remote command";
      // Multi-turn (IQ-style): running electrically disengages hand drive automatically.
      if (isMultiTurn(s.config.family) && e.handMode) {
        e.handMode = false;
        e.handDir = 0;
        if (!silent) this.flash(`${source}: the motor drive re-engaged automatically and the handwheel disengaged.`);
        return;
      }
      if (silent) return;
      if (e.handMode) this.flash(`${source} recorded. The hand/auto lever is locked in hand, so the motor is declutched until it is released.`);
      else if (!s.supplyAvailable) this.flash(`${source} recorded, but there is no power. An electric actuator without stored energy stays where it is until power returns.`);
      if (!s.playing) this.flash("Simulation is paused. Press Play to see the command execute.");
      return;
    }
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
        const keep = { paint: s.paint, config: s.config, mode: s.mode, cutaway: s.cutaway, housingOpacity: s.housingOpacity, showLabels: s.showLabels, speed: s.speed, selectedComponent: s.selectedComponent };
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
        if (isElectric(s.config.family)) {
          this.flash(
            cmd.available
              ? s.commandedStroke === null
                ? "Power restored. No command is active, so nothing moves."
                : "Power restored. The actuator responds to the command that is still active."
              : "Power lost. The motor stops and the self-locking worm holds the valve where it is. The absolute encoder keeps the position, and the battery keeps the display alive.",
          );
          break;
        }
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
      case "stop":
        s.commandedStroke = null;
        derive(s);
        break;
      case "set-selector":
        s.electric.selector = cmd.value;
        if (cmd.value === "stop") {
          s.commandedStroke = null;
          derive(s);
        }
        break;
      case "set-hand":
        s.electric.handMode = cmd.value;
        s.electric.handDir = 0;
        if (cmd.value) this.flash("Hand/auto lever locked in hand. The motor is declutched; use the handwheel.");
        break;
      case "handwheel":
        if (!s.electric.handMode && cmd.dir !== 0) {
          this.flash("Lock the hand/auto lever in hand first. Otherwise the motor drive has priority.");
          break;
        }
        s.electric.handDir = cmd.dir;
        if (cmd.dir !== 0 && !s.playing) s.playing = true;
        break;
      case "set-torque-limit":
        s.electric.torqueLimit = Math.min(1, Math.max(ELECTRIC.torqueLimitMin, cmd.value));
        break;
      case "set-obstruction":
        s.electric.obstruction = cmd.value;
        break;
      case "set-paint":
        s.paint = cmd.value;
        break;
      case "set-close-on-torque":
        s.electric.closeOnTorque = cmd.value;
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
    if (isElectric(s.config.family)) {
      s.status = this.electricStatus();
      return;
    }
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

  private electricStatus(): string {
    const s = this.s;
    const e = s.electric;
    if (!s.playing) return `Paused at ${pct(s.position)} open.`;
    if (e.handMode) {
      if (e.handDir !== 0 && !s.airFlowing && e.obstruction && e.handDir > 0 && s.position > 0.05 && s.position < 0.95)
        return `Handwheel will not turn further at ${pct(s.position)}: the valve is jammed.`;
      return e.handDir !== 0
        ? `Hand operation: handwheel turning the valve ${e.handDir > 0 ? "open" : "closed"}, ${pct(s.position)} open.`
        : isMultiTurn(s.config.family)
          ? `Hand operation engaged at ${pct(s.position)} open. Turn the handwheel; any motor command re-engages motor drive.`
          : `Hand operation locked. Motor declutched at ${pct(s.position)} open; turn the handwheel.`;
    }
    if (e.tripped) return `Torque trip while ${e.tripped} at ${pct(s.position)}: output torque reached the limit, so the motor stopped to protect the valve.`;
    if (s.airFlowing) return `${s.direction === "opening" ? "Opening" : "Closing"} on the motor at constant speed, until a limit or a torque trip.`;
    if (!s.supplyAvailable) return `Power lost. Stopped at ${pct(s.position)} open (fails in place). The encoder still knows the position.`;
    if (e.selector === "stop") return "Local selector at Stop. Commands are ignored.";
    if (s.commandedStroke === null) return `Idle at ${pct(s.position)} open. Issue an Open or Close command.`;
    if (isMultiTurn(s.config.family) && s.position < 0.005)
      return e.seated
        ? "Closed on torque: the wedge was driven into its seats until torque reached the limit, then the motor stopped."
        : "Closed on the position limit: the motor stopped at the set position as the wedge reached its seats.";
    return `Stopped at the ${s.position > 0.5 ? "open" : "closed"} limit. The self-locking worm holds the valve with the motor off.`;
  }

  private copy(): SimulationState {
    const s = this.s;
    return { ...s, config: { ...s.config }, torque: { ...s.torque }, electric: { ...s.electric } };
  }

  private emit() {
    this.emitAccumulator = 0;
    this.snapshot = this.copy();
    this.listeners.forEach((f) => f());
  }
}
