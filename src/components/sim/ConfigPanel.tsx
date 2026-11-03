"use client";

import { Info } from "lucide-react";
import { MODEL, minimumPressureForFullStroke } from "@/lib/sim/model";
import { ELECTRIC, isCompact, isElectric, isMultiTurn } from "@/lib/sim/electric";
import { Button } from "@/components/ui/primitives";
import { RotateCcw, RotateCw } from "lucide-react";
import { Segmented, Switch, Range } from "@/components/ui/controls";
import { Illustrative } from "@/components/ui/primitives";
import { useEngine, useSimState } from "./SimulationProvider";
import { GAS, goStrokeTime, isGas, isGasOverOil } from "@/lib/sim/gas";
import { EH } from "@/lib/sim/electroHydraulic";
import { HYD, isHydraulic } from "@/lib/sim/hydraulic";
import { mechanismFor } from "@/lib/sim/mechanisms";

export function ConfigPanel() {
  const { engine } = useEngine();
  const s = useSimState();
  const sr = s.config.actionType === "spring-return";
  const hyd = isHydraulic(s.config.family);
  const minP = minimumPressureForFullStroke(s.config) / (hyd ? HYD.scale : 1);
  const electric = isElectric(s.config.family);
  const gas = isGas(s.config.family);
  const eh = s.config.family === "electro-hydraulic";
  const yokeFamily = mechanismFor(s.config.family) === "scotch-yoke";

  return (
    <div className="space-y-6">
      {electric ? (
        <ElectricConfig />
      ) : (
        <>
      {s.config.family === "pneumatic-vane" ? (
        <p className="text-[12.5px] leading-snug text-muted">Double acting: air drives the vane both ways and it fails in place. Spring-return vane actuators add a separate spring module, which is not modelled here.</p>
      ) : (
        <>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[13px] font-medium text-fg">Action type</legend>
        <Segmented
          label="Action type"
          className="w-full"
          value={s.config.actionType}
          onChange={(v) => engine.dispatch({ type: "set-config", config: { actionType: v } })}
          options={[
            { value: "double-acting", label: "Double acting" },
            { value: "spring-return", label: "Spring return" },
          ]}
        />
        <p className="text-[12.5px] leading-snug text-muted">
          {sr
            ? eh
              ? "The pump drives one direction against a spring. The dump valve lets the spring drive the other direction, and gives the fail action."
              : `${gas ? "Gas" : isHydraulic(s.config.family) ? "Oil" : "Air"} drives one direction against a spring. The spring drives the other direction and provides the fail action.`
            : eh
              ? "The pump drives both directions through a directional valve. There is no spring, so it fails in place."
              : gas
              ? isGasOverOil(s.config.family)
                ? "Gas pushes oil to either side of the piston. With no spring, stored gas is what closes the valve after a trip."
                : "Gas drives both directions. With no spring, the reserve tank is the stored energy that closes the valve after a line break."
              : `${isHydraulic(s.config.family) ? "Oil" : "Air"} drives both directions. There is no spring, so there is no stored energy to reach a fail position.`}
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-[13px] font-medium text-fg">Fail action</legend>
        <Segmented
          label="Fail action"
          className="w-full"
          value={s.config.failPosition}
          onChange={(v) => engine.dispatch({ type: "set-config", config: { failPosition: v } })}
          options={
            sr
              ? [
                  { value: "fail-closed", label: "Fail closed" },
                  { value: "fail-open", label: "Fail open" },
                ]
              : [{ value: "fail-in-place", label: "Fail in place (no spring)" }]
          }
        />
        <p className="text-[12.5px] leading-snug text-muted">
          {sr
            ? s.config.failPosition === "fail-closed"
              ? "The coupling is oriented so the spring end of the stroke is valve closed."
              : "The coupling is turned 90° so the spring end of the stroke is valve open. Same mechanism, different orientation."
            : gas
              ? "Loss of power gas leaves the valve in place. The line-break control is what drives it closed, using stored gas."
              : "Fail-open or fail-closed needs stored energy. Add a spring module, or an accumulator and control circuit (not modelled here)."}
        </p>
      </fieldset>

        </>
      )}

      {yokeFamily && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[13px] font-medium text-fg">Yoke</legend>
          <Segmented
            label="Yoke"
            className="w-full"
            value={s.config.yoke ?? "symmetric"}
            onChange={(v) => engine.dispatch({ type: "set-config", config: { yoke: v } })}
            options={[
              { value: "symmetric", label: "Symmetric" },
              { value: "canted", label: "Canted" },
            ]}
          />
          <p className="text-[12.5px] leading-snug text-muted">
            {(s.config.yoke ?? "symmetric") === "canted"
              ? "The slot is angled so torque is highest at the start of the stroke, where the valve breaks out of its seat, and lower at the end. Compare the curves in Engineering mode. (The 3D yoke is drawn symmetric; the torque curve changes.)"
              : "Torque is high at both ends of the stroke and lowest in the middle, which suits a ball valve's high seating torque at both ends."}
          </p>
        </fieldset>
      )}

      {gas ? (
        <GasConfig sr={sr} />
      ) : eh ? (
        <ElectroHydraulicConfig sr={sr} />
      ) : (
      <div className="space-y-4 border-t border-rule pt-5">
        <Switch
          tone="air"
          checked={s.supplyAvailable}
          onChange={(v) => engine.dispatch({ type: "set-supply", available: v })}
          label={hyd ? "Hydraulic supply available" : "Supply available"}
          description={
            hyd
              ? sr
                ? "Turn off to simulate loss of the hydraulic power unit. The cylinder drains to tank and the spring acts."
                : "Turn off to simulate loss of the hydraulic power unit. The trapped oil holds the valve in place."
              : sr
                ? "Turn off to simulate loss of instrument air. The spring will act."
                : `Turn off to simulate loss of instrument air. Nothing will drive the ${s.config.family === "pneumatic-vane" ? "vane" : "piston"}.`
          }
        />

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="pressure" className="text-[14px] font-medium text-fg">
              Supply pressure
            </label>
            <span className="num text-[14px] text-fg">{s.supplyPressure.toFixed(hyd ? 0 : 1)} bar</span>
          </div>
          <Range
            id="pressure"
            label="Supply pressure"
            valueText={`${s.supplyPressure.toFixed(hyd ? 0 : 1)} bar`}
            min={hyd ? HYD.pressureMin : MODEL.pressureMin}
            max={hyd ? HYD.pressureMax : MODEL.pressureMax}
            step={hyd ? 1 : 0.1}
            value={s.supplyPressure}
            onChange={(v) => engine.dispatch({ type: "set-pressure", bar: v })}
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This model needs about <span className="num text-fg-2">{minP.toFixed(hyd ? 0 : 1)} bar</span> to complete the {hyd ? "powered" : "air"} stroke. Below that it stalls part-way.{" "}
              <Illustrative>Illustrative model</Illustrative>
            </span>
          </p>
        </div>
        {hyd && (
          <div>
            <div className="mb-1 flex items-baseline justify-between text-[13px]">
              <label htmlFor="hyd-flow" className="text-fg">Flow-control setting</label>
              <span className="num text-fg">{(HYD.strokeTime / Math.max(GAS.flowMin, s.gas.flow)).toFixed(1)} s stroke</span>
            </div>
            <Range id="hyd-flow" label="Flow-control setting" min={GAS.flowMin} max={1} step={0.01} value={s.gas.flow} onChange={(v) => engine.dispatch({ type: "set-flow", value: v })} />
            <p className="mt-1.5 text-[12.5px] leading-snug text-muted">Oil is metered, so speed is steady and set here, while pressure sets the available torque.</p>
          </div>
        )}
      </div>
      )}

        </>
      )}

      <div className="space-y-4 border-t border-rule pt-5">
        <div>
          <div className="mb-2 text-[13px] font-medium text-fg">Housing view</div>
          <Segmented
            label="Housing view"
            className="w-full"
            value={s.cutaway}
            onChange={(v) => engine.dispatch({ type: "set-cutaway", style: v })}
            options={[
              { value: "solid", label: "Solid" },
              { value: "ghost", label: "Transparent" },
              { value: "section", label: "Half section" },
            ]}
          />
        </div>
        {s.cutaway === "ghost" && (
          <div>
            <div className="mb-1 flex items-baseline justify-between text-[13px]">
              <span className="text-muted">Housing opacity</span>
              <span className="num text-fg">{Math.round(s.housingOpacity * 100)}%</span>
            </div>
            <Range
              label="Housing opacity"
              min={0.05}
              max={0.9}
              step={0.01}
              value={s.housingOpacity}
              onChange={(v) => engine.dispatch({ type: "set-housing-opacity", value: v })}
            />
          </div>
        )}
        <div>
          <div className="mb-2 text-[13px] font-medium text-fg">Paint finish</div>
          <Segmented
            label="Paint finish"
            className="w-full"
            value={s.paint}
            onChange={(v) => engine.dispatch({ type: "set-paint", value: v })}
            options={[
              { value: "graphite", label: "Graphite" },
              { value: "red", label: "Red" },
              { value: "blue", label: "Blue" },
              { value: "yellow", label: "Yellow" },
            ]}
          />
          <p className="mt-1.5 text-[12.5px] text-muted">Actuators are painted to customer specification; colour does not identify a manufacturer here.</p>
        </div>
        <Switch checked={s.showLabels} onChange={(v) => engine.dispatch({ type: "set-labels", value: v })} label="Movement labels" description="Label the moving parts in the scene." />
      </div>
    </div>
  );
}

/** Hold-to-turn button (handwheel or hand pump): acts while pressed, stops on release. */
function HandwheelButton({ dir, children, pump = false }: { dir: -1 | 1; children: React.ReactNode; pump?: boolean }) {
  const { engine } = useEngine();
  const send = (d: -1 | 0 | 1) => engine.dispatch(pump ? { type: "pump", dir: d } : { type: "handwheel", dir: d });
  const stop = () => send(0);
  return (
    <Button
      size="sm"
      variant="secondary"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        send(dir);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          send(dir);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      onBlur={stop}
    >
      {children}
    </Button>
  );
}

function ElectricConfig() {
  const { engine } = useEngine();
  const s = useSimState();
  const e = s.electric;
  return (
    <>
      <div className="space-y-4">
        <Switch
          checked={s.supplyAvailable}
          onChange={(v) => engine.dispatch({ type: "set-supply", available: v })}
          label="Power available"
          description="Turn off to simulate loss of mains power. With no stored energy, the actuator stops where it is."
        />
      </div>

      {isCompact(s.config.family) ? (
        <p className="border-t border-rule pt-5 text-[12.5px] leading-snug text-muted">No local controls are fitted on this compact actuator, so Open and Close are remote commands. A local control unit is an option on real units.</p>
      ) : (
      <div className="border-t border-rule pt-5">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[13px] font-medium text-fg">Local selector</legend>
        <Segmented
          label="Local selector"
          className="w-full"
          value={e.selector}
          onChange={(v) => engine.dispatch({ type: "set-selector", value: v })}
          options={[
            { value: "local", label: "Local" },
            { value: "stop", label: "Stop" },
            { value: "remote", label: "Remote" },
          ]}
        />
        <p className="text-[12.5px] leading-snug text-muted">
          {e.selector === "local"
            ? "Open and Close act as the actuator's own local controls."
            : e.selector === "remote"
              ? "Open and Close act as commands from the control system."
              : "Stop: the motor will not run from any command."}
        </p>
      </fieldset>
      </div>
      )}

      <div className="space-y-3 border-t border-rule pt-5">
        <Switch checked={e.handMode} onChange={(v) => engine.dispatch({ type: "set-hand", value: v })} label="Hand/auto lever locked in hand" description="Declutches the motor so the handwheel drives the valve. Works with no power." />
        {e.handMode && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Hold to turn:</span>
            <HandwheelButton dir={-1}>
              <RotateCcw aria-hidden /> Toward closed
            </HandwheelButton>
            <HandwheelButton dir={1}>
              <RotateCw aria-hidden /> Toward open
            </HandwheelButton>
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-rule pt-5">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="torque-limit" className="text-[15px] text-fg">
              {isCompact(s.config.family) ? "Torque switch setting" : "Torque limit"}
            </label>
            <span className="num text-[14px] text-fg">{Math.round(e.torqueLimit * 100)}% of rated</span>
          </div>
          <Range
            id="torque-limit"
            label="Torque limit"
            valueText={`${Math.round(e.torqueLimit * 100)} percent of rated torque`}
            min={ELECTRIC.torqueLimitMin}
            max={1}
            step={0.01}
            value={e.torqueLimit}
            onChange={(v) => engine.dispatch({ type: "set-torque-limit", value: v })}
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              The motor switches off when torque reaches this setting. Set it below the valve&apos;s break-out torque and it trips at the seat. <Illustrative>Illustrative model</Illustrative>
            </span>
          </p>
        </div>
        {isMultiTurn(s.config.family) && (
          <Switch
            checked={e.closeOnTorque}
            onChange={(v) => engine.dispatch({ type: "set-close-on-torque", value: v })}
            label="Close on torque"
            description={e.closeOnTorque ? "The wedge is driven into its seats until torque reaches the limit. Common for wedge gate valves." : "The motor stops at the set closed position, before the wedge is driven fully home."}
          />
        )}
        <Switch checked={e.obstruction} onChange={(v) => engine.dispatch({ type: "set-obstruction", value: v })} label="Jam the valve at about 55% open" description="Teaching aid: watch the torque protection stop the motor instead of forcing the valve." />
      </div>
    </>
  );
}

function GasConfig({ sr }: { sr: boolean }) {
  const { engine } = useEngine();
  const s = useSimState();
  const g = s.gas;
  const go = isGasOverOil(s.config.family);
  const minBar = minimumPressureForFullStroke(s.config) / GAS.scale;
  return (
    <>
      <div className="space-y-4 border-t border-rule pt-5">
        <Switch
          tone="air"
          checked={s.supplyAvailable}
          onChange={(v) => engine.dispatch({ type: "set-supply", available: v })}
          label="Power gas to controls"
          description={sr ? "Isolate to vent the cylinder: the spring drives the valve to its fail position." : "Isolate to remove the gas supply: the valve stays where it is."}
        />
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="pipeline" className="text-[14px] font-medium text-fg">
              Pipeline pressure
            </label>
            <span className="num text-[14px] text-fg">{g.pipeline.toFixed(0)} bar</span>
          </div>
          <Range
            id="pipeline"
            label="Pipeline pressure"
            valueText={`${g.pipeline.toFixed(0)} bar`}
            min={GAS.pipelineMin}
            max={GAS.pipelineMax}
            step={1}
            value={g.pipelineSet}
            onChange={(v) => engine.dispatch({ type: "set-pressure", bar: v })}
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {go ? "Pipeline gas pushes the oil that drives the actuator." : "The actuator runs on the gas it controls."} This model needs about <span className="num text-fg-2">{minBar.toFixed(0)} bar</span> in the reserve tank to complete a stroke. <Illustrative>Illustrative model</Illustrative>
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-rule pt-5">
        <Switch checked={g.armed} onChange={(v) => engine.dispatch({ type: "set-line-break-armed", value: v })} label="Line-break detection armed" description="Close the valve automatically if pipeline pressure falls faster than the set point." />
        <div>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <label htmlFor="lb-rate" className="text-fg">Rate-of-drop set point</label>
            <span className="num text-fg">{g.setPoint.toFixed(1)} bar/s</span>
          </div>
          <Range id="lb-rate" label="Rate-of-drop set point" valueText={`${g.setPoint.toFixed(1)} bar per second`} min={GAS.rateMin} max={GAS.rateMax} step={0.1} value={g.setPoint} onChange={(v) => engine.dispatch({ type: "set-line-break-rate", value: v })} />
          {go && (
            <div className="mt-4">
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <label htmlFor="lb-low" className="text-fg">Low-pressure trip</label>
                <span className="num text-fg">{g.lowSet.toFixed(0)} bar</span>
              </div>
              <Range id="lb-low" label="Low-pressure trip" valueText={`${g.lowSet.toFixed(0)} bar`} min={GAS.lowMin} max={GAS.lowMax} step={1} value={g.lowSet} onChange={(v) => engine.dispatch({ type: "set-low-set", value: v })} />
            </div>
          )}
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">The rate must stay above the set point for {GAS.tripDelay} s before it trips. Too low and normal transients cause spurious closures; too high and a small rupture is missed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={g.ruptured ? "secondary" : "primary"} onClick={() => engine.dispatch({ type: "set-rupture", value: !g.ruptured })}>
            {g.ruptured ? "Repair pipeline" : "Rupture pipeline downstream"}
          </Button>
          {g.tripped && (
            <Button size="sm" variant="secondary" onClick={() => engine.dispatch({ type: "reset-line-break" })}>
              Reset trip
            </Button>
          )}
        </div>
      </div>

      {go && (
        <div className="border-t border-rule pt-5">
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <label htmlFor="go-flow" className="text-fg">Flow-control setting</label>
            <span className="num text-fg">{goStrokeTime(g.flow).toFixed(1)} s stroke</span>
          </div>
          <Range id="go-flow" label="Flow-control setting" valueText={`${goStrokeTime(g.flow).toFixed(1)} second stroke`} min={GAS.flowMin} max={1} step={0.01} value={g.flow} onChange={(v) => engine.dispatch({ type: "set-flow", value: v })} />
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">Oil is metered, so the stroke runs at a steady speed set here. Change pipeline pressure and the speed barely moves; on a direct-gas actuator it would. <Illustrative>Illustrative</Illustrative></p>
        </div>
      )}

      <div className="space-y-3 border-t border-rule pt-5">
        <Switch checked={g.manual} onChange={(v) => engine.dispatch({ type: "set-manual", value: v })} label="Hydraulic manual override" description="Isolates the gas controls. The hand pump moves the actuator; trapped oil holds it." />
        {g.manual && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Hold to pump:</span>
            <HandwheelButton dir={-1} pump>
              <RotateCcw aria-hidden /> Toward closed
            </HandwheelButton>
            <HandwheelButton dir={1} pump>
              <RotateCw aria-hidden /> Toward open
            </HandwheelButton>
          </div>
        )}
      </div>
    </>
  );
}

function ElectroHydraulicConfig({ sr }: { sr: boolean }) {
  const { engine } = useEngine();
  const s = useSimState();
  const h = s.eh;
  const demandPct = h.demand === null ? null : Math.round(h.demand * 100);
  return (
    <>
      <div className="space-y-4 border-t border-rule pt-5">
        <Switch
          checked={s.supplyAvailable}
          onChange={(v) => engine.dispatch({ type: "set-supply", available: v })}
          label="Power available"
          description={sr ? "Turn off: the dump solenoid de-energises and the spring drives the valve to its fail position." : "Turn off: the pump stops and the valve holds where it is."}
        />
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="eh-demand" className="text-[14px] font-medium text-fg">
              Position demand
            </label>
            <span className="num text-[14px] text-fg">{demandPct === null ? "none" : `${demandPct}%`}</span>
          </div>
          <Range
            id="eh-demand"
            label="Position demand"
            valueText={demandPct === null ? "no demand" : `${demandPct} percent open`}
            min={0}
            max={1}
            step={0.01}
            value={h.demand ?? s.position}
            onChange={(v) => engine.dispatch({ type: "set-demand", value: v })}
          />
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
            The integral controller runs the pump or opens the dump valve until the valve is within a small deadband of the demand, then locks the oil in. Open and Close set 100% and 0%. <Illustrative>Illustrative</Illustrative>
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-rule pt-5">
        <Switch
          checked={h.esd}
          onChange={(v) => engine.dispatch({ type: "set-esd", value: v })}
          label="Emergency shutdown (ESD) input"
          description="A separate safety input that overrides the demand and drives the valve to its fail position."
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => engine.dispatch({ type: "start-pst" })}>
              Run partial-stroke test
            </Button>
            <span className={`text-[13px] ${h.pst === "failed" ? "text-danger" : h.pst === "passed" ? "text-ok" : "text-muted"}`}>
              {h.pst === "idle" ? "Not run" : h.pst === "out" || h.pst === "back" ? "Running" : h.pst === "passed" ? "Passed" : "Failed"}
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">From the normal (powered) position, moves the valve {Math.round(EH.pstTravel * 100)}% toward its fail position and back. It proves the valve is free without shutting the process down.</p>
        </div>
        <Switch checked={h.stuck} onChange={(v) => engine.dispatch({ type: "set-stuck", value: v })} label="Valve stuck (teaching aid)" description="Simulate a seized valve and watch the partial-stroke test catch it." />
      </div>
    </>
  );
}
