/**
 * Self-contained electro-hydraulic actuator with an integral controller.
 * The controller turns a demand into pump runs (toward the stroke end,
 * compressing the spring) and dump-valve releases (spring stroke). Without
 * power or with ESD, the dump valve opens and the spring drives to the fail
 * position; a double-acting unit stays put.
 */
import { strokeFromValvePosition, valvePositionFromStroke } from "../model";
import { EH } from "../electroHydraulic";
import type { SimulationState } from "../types";
import { fluidForces } from "./fluid";
import { END_EPS, finishMotion, pct, smoothstep, subStep, type FamilyBehavior, type FamilyContext } from "./shared";

function ehStep(ctx: FamilyContext, dt: number) {
  const s = ctx.s;
  const h = s.eh;
  const sr = s.config.actionType === "spring-return";
  const prevPst = h.pst;
  let targetStroke: number | null = null;
  const failSafe = !s.supplyAvailable || h.esd;
  if (failSafe) {
    targetStroke = sr ? 0 : null; // stroke 0 is the spring end
    if (h.pst === "out" || h.pst === "back") h.pst = "idle";
  } else if (h.pst === "out") {
    const goal = 1 - EH.pstTravel; // from the powered end toward the spring end
    targetStroke = goal;
    if (Math.abs(s.stroke - goal) < EH.deadband * 2) {
      h.pst = "back";
      h.pstStart = s.time;
    } else if (s.time - h.pstStart > EH.pstTimeout) {
      h.pst = "failed";
      h.pstStart = s.time;
    }
  } else if (h.pst === "back") {
    targetStroke = 1;
    if (Math.abs(s.stroke - targetStroke) < EH.deadband) h.pst = "passed";
  } else if (h.demand !== null) {
    targetStroke = strokeFromValvePosition(s.config, h.demand);
  }

  let vTarget = 0;
  h.motorRunning = false;
  h.dumping = false;
  if (targetStroke !== null && !h.stuck) {
    const err = targetStroke - s.stroke;
    if (Math.abs(err) > EH.deadband || (Math.abs(err) > 1e-4 && Math.abs(s.velocity) > 1e-4)) {
      const dir = Math.sign(err);
      const pumped = dir > 0 || !sr;
      // Slow down over the last few percent so the positioner lands without overshoot.
      vTarget = (dir / (pumped ? EH.pumpStrokeTime : EH.springStrokeTime)) * (0.25 + 0.75 * smoothstep(0, 0.05, Math.abs(err)));
      h.motorRunning = pumped && !failSafe;
      h.dumping = !pumped;
    }
  } else if (failSafe && sr && !h.stuck && s.stroke > END_EPS) {
    vTarget = -1 / EH.springStrokeTime;
    h.dumping = true;
  }

  // Oil is stiff and the solenoid holds it: motion stops promptly.
  s.velocity += (vTarget - s.velocity) * (1 - Math.exp(-dt * 25));
  if (vTarget === 0 && Math.abs(s.velocity) < 1e-3) s.velocity = 0;
  s.stroke = Math.min(1, Math.max(0, s.stroke + s.velocity * dt));
  if ((s.stroke >= 1 && s.velocity > 0) || (s.stroke <= 0 && s.velocity < 0)) s.velocity = 0;

  const holding = !failSafe && targetStroke !== null && (sr ? s.stroke > END_EPS : true);
  h.pressure += ((h.motorRunning ? EH.workingPressure : holding ? EH.workingPressure * 0.85 : 0) - h.pressure) * (1 - Math.exp(-dt * 6));
  ctx.derive();
  ctx.forces();
  s.stalled = false;
  finishMotion(s);

  ctx.cycle(dt, !s.airFlowing && h.pst !== "out" && h.pst !== "back", () => {
    h.demand = s.position < 0.5 ? 1 : 0;
  });
  if (prevPst !== h.pst) {
    if (h.pst === "passed") ctx.flash("Partial-stroke test passed: the valve moved off its normal position and returned, without interrupting the process.");
    if (h.pst === "failed") ctx.flash("Partial-stroke test failed: the valve did not move in time. In service this raises an alarm, because the valve might not close on demand.");
    ctx.emit();
  }
}

function ehStatus(s: SimulationState): string {
  const h = s.eh;
  const sr = s.config.actionType === "spring-return";
  if (!s.playing) return `Paused at ${pct(s.position)} open.`;
  if (h.pst === "out") return h.stuck ? "Partial-stroke test: commanding a small move, but the valve is not responding." : `Partial-stroke test: moving ${Math.round(EH.pstTravel * 100)}% toward the fail position, then back.`;
  if (h.pst === "back") return "Partial-stroke test: returning to the normal position.";
  if (h.esd) return sr ? (s.airFlowing ? "ESD: dump valve open, spring driving to the fail position." : `ESD: held at the fail position (${pct(s.position)} open) by the spring.`) : `ESD: pump stopped, valve held at ${pct(s.position)}.`;
  if (!s.supplyAvailable)
    return sr ? (s.airFlowing ? "Power lost: the dump solenoid de-energised and the spring is driving the valve to its fail position." : `Power lost: at the fail position, ${pct(s.position)} open.`) : `Power lost: no pump, valve held at ${pct(s.position)} (fails in place).`;
  if (h.motorRunning) return `Pump running: oil into the cylinder drives the valve toward ${pct(h.demand ?? 1)}${sr ? ", compressing the spring" : ""}.`;
  if (h.dumping) return `Dump valve open: ${sr ? "the spring drives" : "oil drives"} the valve toward ${pct(h.demand ?? 0)}.`;
  if (h.stuck && h.demand !== null && Math.abs(h.demand - s.position) > EH.deadband) return `The valve is stuck at ${pct(s.position)}: the controller cannot reach the ${pct(h.demand)} demand.`;
  if (h.demand === null) return "Idle. Set a demand, or press Open or Close.";
  return `In position at ${pct(s.position)}. The pump is off; the solenoid valve locks the oil in.${h.pst === "passed" ? " Last partial-stroke test: passed." : h.pst === "failed" ? " Last partial-stroke test: FAILED." : ""}`;
}

export const ELECTRO_HYDRAULIC: FamilyBehavior = {
  // Pump pressurises chamber A; the dump valve drains it back to the reservoir.
  chambers: (s) => {
    const h = s.eh;
    const a = h.motorRunning ? "supply" : h.dumping ? "exhaust" : "idle";
    const b = s.config.actionType === "spring-return" ? "atmosphere" : h.motorRunning ? "exhaust" : h.dumping ? "supply" : "idle";
    return [a, b];
  },
  forces: (s) => fluidForces(s, s.supplyPressure),
  step: (ctx, dt) => subStep(dt, (h) => ehStep(ctx, h)),
  command(ctx, kind, silent) {
    const s = ctx.s;
    s.eh.demand = kind === "open" ? 1 : 0;
    if (s.eh.pst === "out" || s.eh.pst === "back") s.eh.pst = "idle";
    s.commandedStroke = strokeFromValvePosition(s.config, kind === "open" ? 1 : 0) as 0 | 1;
    ctx.derive();
    if (silent) return;
    if (s.eh.esd) ctx.flash("ESD is active, so the controller holds the fail position. Clear the ESD input first.");
    else if (!s.supplyAvailable) ctx.flash("Demand recorded, but there is no power to run the pump.");
  },
  supplyNotice: (s, available) =>
    !available
      ? s.config.actionType === "spring-return"
        ? "Power lost. The dump solenoid de-energises, oil returns to the reservoir and the spring drives the valve to its fail position."
        : "Power lost. The pump stops and the locked-in oil holds the valve where it is."
      : "Power restored. The controller returns the valve to its demand.",
  setPressure: () => {},
  handle(ctx, cmd) {
    const s = ctx.s;
    const h = s.eh;
    switch (cmd.type) {
      case "set-demand":
        h.demand = cmd.value === null ? null : Math.min(1, Math.max(0, cmd.value));
        if (h.pst === "out" || h.pst === "back") h.pst = "idle";
        if (!s.playing) s.playing = true;
        return true;
      case "set-esd":
        h.esd = cmd.value;
        ctx.flash(
          cmd.value
            ? s.config.actionType === "spring-return"
              ? "ESD: the controller opens the dump valve and the spring drives the valve to its fail position, whatever the demand."
              : "ESD on a double-acting unit: the pump stops and the valve holds. A spring-return unit would move to its fail position."
            : "ESD cleared. The controller returns to the demand signal.",
        );
        return true;
      case "start-pst":
        if (h.esd || !s.supplyAvailable) ctx.flash("A partial-stroke test needs power and no ESD.");
        else if (s.stroke < 0.98)
          ctx.flash("Partial-stroke tests run from the normal powered position (the end away from the spring). They prove the safety valve can still move toward its fail position.");
        else {
          h.pst = "out";
          h.pstStart = s.time;
          h.demand = valvePositionFromStroke(s.config, 1);
          if (!s.playing) s.playing = true;
        }
        return true;
      case "set-stuck":
        h.stuck = cmd.value;
        return true;
      case "stop":
        h.demand = s.position; // hold here; the core then clears the command
        return false;
      default:
        return false;
    }
  },
  status: ehStatus,
};

