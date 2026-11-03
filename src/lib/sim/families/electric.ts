/**
 * Electric actuators (intelligent part-turn, multi-turn, compact): constant
 * motor speed until a position limit, a torque trip, a Stop, or loss of
 * power. Self-locking gearing holds position the instant the motor stops.
 * In hand mode the motor is declutched and only the handwheel moves the output.
 */
import { strokeFromValvePosition } from "../model";
import { COMPACT, ELECTRIC, MULTI_TURN, electricDemand, isCompact, isMultiTurn, torqueLimitValue } from "../electric";
import type { SimulationState } from "../types";
import { atStrokeEnd, finishMotion, pct, subStep, type FamilyBehavior, type FamilyContext } from "./shared";

function electricStep(ctx: FamilyContext, dt: number) {
  const s = ctx.s;
  const e = s.electric;
  let vTarget = 0;
  let running = false;
  const prevTrip = e.tripped;
  const prevSeated = e.seated;
  const multi = isMultiTurn(s.config.family);
  const compact = isCompact(s.config.family);
  const strokeTime = multi ? MULTI_TURN.strokeTime : compact ? COMPACT.strokeTime : ELECTRIC.strokeTime;
  const handTime = multi ? MULTI_TURN.handStrokeTime : compact ? COMPACT.handStrokeTime : ELECTRIC.handStrokeTime;

  if (e.handMode) {
    if (e.handDir !== 0 && !atStrokeEnd(s, e.handDir)) {
      const [a, b] = ELECTRIC.obstructionWindow;
      const jammed = e.obstruction && e.handDir > 0 && s.position >= a && s.position <= b;
      if (!jammed) vTarget = e.handDir / handTime;
    }
  } else if (s.supplyAvailable && e.selector !== "stop" && s.commandedStroke !== null && !e.tripped && !(e.seated && s.commandedStroke === 0)) {
    const dir = s.commandedStroke === 1 ? 1 : -1;
    if (!atStrokeEnd(s, dir)) {
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

  ctx.derive();
  e.motorRunning = running;
  const demandNow = electricDemand(s.position, e.obstruction, s.velocity >= 0, s.config.family);
  e.outputTorque = running ? demandNow : (e.tripped && !prevTrip) || (e.seated && !prevSeated) ? torqueLimitValue(e.torqueLimit) : 0;
  s.torque = { air: 0, spring: 0, valveDemand: demandNow, net: torqueLimitValue(e.torqueLimit) - demandNow };
  s.stalled = false;
  finishMotion(s);

  ctx.cycle(dt, !s.airFlowing && !e.handMode, () => {
    e.tripped = null;
    ctx.command(s.position < 0.5 ? "open" : "close", true);
  });
  if (prevTrip !== e.tripped || prevSeated !== e.seated) ctx.emit();
}

function electricStatus(s: SimulationState): string {
  const e = s.electric;
  const multi = isMultiTurn(s.config.family);
  const compact = isCompact(s.config.family);
  if (!s.playing) return `Paused at ${pct(s.position)} open.`;
  if (e.handMode) {
    if (e.handDir !== 0 && !s.airFlowing && e.obstruction && e.handDir > 0 && s.position > 0.05 && s.position < 0.95)
      return `Handwheel will not turn further at ${pct(s.position)}: the valve is jammed.`;
    return e.handDir !== 0
      ? `Hand operation: handwheel turning the valve ${e.handDir > 0 ? "open" : "closed"}, ${pct(s.position)} open.`
      : multi
        ? `Hand operation engaged at ${pct(s.position)} open. Turn the handwheel; any motor command re-engages motor drive.`
        : `Hand operation locked. Motor declutched at ${pct(s.position)} open; turn the handwheel.`;
  }
  if (e.tripped && compact)
    return `Torque switch tripped while ${e.tripped} at ${pct(s.position)}: the spring-set mechanical switch opened the motor circuit. There is no torque value to read, only "tripped".`;
  if (e.tripped) return `Torque trip while ${e.tripped} at ${pct(s.position)}: output torque reached the limit, so the motor stopped to protect the valve.`;
  if (s.airFlowing) return `${s.direction === "opening" ? "Opening" : "Closing"} on the motor at constant speed, until a limit or a torque trip.`;
  if (!s.supplyAvailable)
    return compact
      ? `Power lost. Stopped at ${pct(s.position)} open (fails in place). Only the mechanical indicator shows where.`
      : `Power lost. Stopped at ${pct(s.position)} open (fails in place). The encoder still knows the position.`;
  if (e.selector === "stop") return "Local selector at Stop. Commands are ignored.";
  if (s.commandedStroke === null) return `Idle at ${pct(s.position)} open. Issue an Open or Close command.`;
  if (multi && s.position < 0.005)
    return e.seated
      ? "Closed on torque: the wedge was driven into its seats until torque reached the limit, then the motor stopped."
      : "Closed on the position limit: the motor stopped at the set position as the wedge reached its seats.";
  if (compact) return `Stopped by the ${s.position > 0.5 ? "open" : "closed"} cam limit switch. The self-locking gearing holds the valve with the motor off.`;
  return `Stopped at the ${s.position > 0.5 ? "open" : "closed"} limit. The self-locking worm holds the valve with the motor off.`;
}

export const ELECTRIC_FAMILY: FamilyBehavior = {
  // No spring and no coupling flip; the ball valve is the modelled load.
  normalise: (c) => ({ ...c, actionType: "double-acting", failPosition: "fail-in-place", valve: "ball" }),
  chambers: () => ["idle", "idle"],
  forces(s) {
    const e = s.electric;
    const demand = electricDemand(s.position, e.obstruction, s.velocity >= 0, s.config.family);
    s.torque = { air: 0, spring: 0, valveDemand: demand, net: torqueLimitValue(e.torqueLimit) - demand };
    return { active: 0, air: 0, spring: 0, demand };
  },
  // Fixed sub-steps so narrow events (wedge seating, a jam) are never stepped over on slow devices.
  step: (ctx, dt) => subStep(dt, (h) => electricStep(ctx, h)),
  command(ctx, kind, silent) {
    const s = ctx.s;
    const e = s.electric;
    if (!silent && e.selector === "stop") {
      ctx.flash("The local selector is at Stop, so commands are ignored. Turn it to Local or Remote.");
      return;
    }
    const targetStroke = strokeFromValvePosition(s.config, kind === "open" ? 1 : 0) as 0 | 1;
    s.commandedStroke = targetStroke;
    e.tripped = null;
    if (targetStroke === 1) e.seated = false;
    ctx.derive();
    const source = e.selector === "local" ? "Local control" : "Remote command";
    // Multi-turn: running electrically disengages hand drive automatically.
    if (isMultiTurn(s.config.family) && e.handMode) {
      e.handMode = false;
      e.handDir = 0;
      if (!silent) ctx.flash(`${source}: the motor drive re-engaged automatically and the handwheel disengaged.`);
      return;
    }
    if (silent) return;
    if (e.handMode) ctx.flash(`${source} recorded. The hand/auto lever is locked in hand, so the motor is declutched until it is released.`);
    else if (!s.supplyAvailable) ctx.flash(`${source} recorded, but there is no power. An electric actuator without stored energy stays where it is until power returns.`);
    if (!s.playing) ctx.flash("Simulation is paused. Press Play to see the command execute.");
  },
  supplyNotice: (s, available) =>
    available
      ? s.commandedStroke === null
        ? "Power restored. No command is active, so nothing moves."
        : "Power restored. The actuator responds to the command that is still active."
      : isCompact(s.config.family)
        ? "Power lost. The motor stops and the self-locking gearing holds the valve where it is. The domed indicator still shows the position mechanically."
        : "Power lost. The motor stops and the self-locking worm holds the valve where it is. The absolute encoder keeps the position, and the battery keeps the display alive.",
  setPressure: () => {},
  handle(ctx, cmd) {
    const s = ctx.s;
    const e = s.electric;
    switch (cmd.type) {
      case "set-selector":
        if (isCompact(s.config.family)) return true; // no local selector fitted
        e.selector = cmd.value;
        if (cmd.value === "stop") {
          s.commandedStroke = null;
          ctx.derive();
        }
        return true;
      case "set-hand":
        e.handMode = cmd.value;
        e.handDir = 0;
        if (cmd.value) ctx.flash("Hand/auto lever locked in hand. The motor is declutched; use the handwheel.");
        return true;
      case "handwheel":
        if (!e.handMode && cmd.dir !== 0) {
          ctx.flash("Lock the hand/auto lever in hand first. Otherwise the motor drive has priority.");
          return true;
        }
        e.handDir = cmd.dir;
        if (cmd.dir !== 0 && !s.playing) s.playing = true;
        return true;
      case "set-torque-limit":
        e.torqueLimit = Math.min(1, Math.max(ELECTRIC.torqueLimitMin, cmd.value));
        return true;
      case "set-obstruction":
        e.obstruction = cmd.value;
        return true;
      case "set-close-on-torque":
        e.closeOnTorque = cmd.value;
        return true;
      default:
        return false;
    }
  },
  status: electricStatus,
};
