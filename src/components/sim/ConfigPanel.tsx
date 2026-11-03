"use client";

import { Info } from "lucide-react";
import { MODEL, minimumPressureForFullStroke } from "@/lib/sim/model";
import { ELECTRIC, isElectric, isMultiTurn } from "@/lib/sim/electric";
import { Button } from "@/components/ui/primitives";
import { RotateCcw, RotateCw } from "lucide-react";
import { Segmented, Switch, Range } from "@/components/ui/controls";
import { Illustrative } from "@/components/ui/primitives";
import { useEngine, useSimState } from "./SimulationProvider";

export function ConfigPanel() {
  const { engine } = useEngine();
  const s = useSimState();
  const sr = s.config.actionType === "spring-return";
  const minP = minimumPressureForFullStroke(s.config);
  const electric = isElectric(s.config.family);

  return (
    <div className="space-y-6">
      {electric ? (
        <ElectricConfig />
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
            ? "Air drives one direction against a spring. The spring drives the other direction and provides the fail action."
            : "Air drives both directions. There is no spring, so there is no stored energy to reach a fail position."}
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
            : "Fail-open or fail-closed needs stored energy. Add a spring module, or an accumulator and control circuit (not modelled here)."}
        </p>
      </fieldset>

      <div className="space-y-4 border-t border-rule pt-5">
        <Switch
          tone="air"
          checked={s.supplyAvailable}
          onChange={(v) => engine.dispatch({ type: "set-supply", available: v })}
          label="Supply available"
          description={sr ? "Turn off to simulate loss of instrument air. The spring will act." : "Turn off to simulate loss of instrument air. Nothing will drive the piston."}
        />

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="pressure" className="text-[14px] font-medium text-fg">
              Supply pressure
            </label>
            <span className="num text-[14px] text-fg">{s.supplyPressure.toFixed(1)} bar</span>
          </div>
          <Range
            id="pressure"
            label="Supply pressure"
            valueText={`${s.supplyPressure.toFixed(1)} bar`}
            min={MODEL.pressureMin}
            max={MODEL.pressureMax}
            step={0.1}
            value={s.supplyPressure}
            onChange={(v) => engine.dispatch({ type: "set-pressure", bar: v })}
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This model needs about <span className="num text-fg-2">{minP.toFixed(1)} bar</span> to complete the air stroke. Below that it stalls part-way.{" "}
              <Illustrative>Illustrative model</Illustrative>
            </span>
          </p>
        </div>
      </div>

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

/** Hold-to-turn handwheel button: turns while pressed, stops on release. */
function HandwheelButton({ dir, children }: { dir: -1 | 1; children: React.ReactNode }) {
  const { engine } = useEngine();
  const stop = () => engine.dispatch({ type: "handwheel", dir: 0 });
  return (
    <Button
      size="sm"
      variant="secondary"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        engine.dispatch({ type: "handwheel", dir });
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          engine.dispatch({ type: "handwheel", dir });
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
              Torque limit
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
              The motor switches off when sensed torque reaches this setting. Set it below the valve&apos;s break-out torque and it trips at the seat. <Illustrative>Illustrative model</Illustrative>
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
