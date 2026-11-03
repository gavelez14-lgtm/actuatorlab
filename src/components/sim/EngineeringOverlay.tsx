"use client";

import { Illustrative } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useSimSelector, useSimState } from "./SimulationProvider";
import { MULTI_TURN, isCompact, isElectric, isMultiTurn, torqueLimitValue } from "@/lib/sim/electric";
import { ElectricTorqueChart, TorqueChart } from "./TorqueChart";
import { isGas, pipelineToModel } from "@/lib/sim/gas";

function Row({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: "air" | "warn" | "danger" | "ok" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd
        className={cn(
          "num text-[13px] font-medium",
          tone === "air" ? "text-air" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : tone === "ok" ? "text-ok" : "text-fg",
        )}
      >
        {value}
        {unit && <span className="ml-0.5 text-muted">{unit}</span>}
      </dd>
    </div>
  );
}

function ElectricEngineering() {
  const s = useSimState();
  const e = s.electric;
  return (
    <div className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-sans text-[13px] font-semibold text-fg">Engineering view</h3>
        <Illustrative>Illustrative, not certified</Illustrative>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 border-y border-rule py-1">
        <Row label="Valve position" value={`${(s.position * 100).toFixed(1)}`} unit="%" />
        {isMultiTurn(s.config.family) ? <Row label="Output turns" value={(s.stroke * MULTI_TURN.outputTurns).toFixed(1)} /> : <Row label="Output angle" value={s.outputAngle.toFixed(1)} unit="°" />}
        <Row label="Power" value={s.supplyAvailable ? "on" : "off"} tone={s.supplyAvailable ? "ok" : "danger"} />
        <Row label="Motor" value={e.motorRunning ? "running" : e.tripped ? "tripped" : "stopped"} tone={e.tripped ? "danger" : e.motorRunning ? "ok" : undefined} />
        {isCompact(s.config.family) ? (
          <>
            <Row label="Torque switch" value={e.tripped ? "tripped" : "made"} tone={e.tripped ? "danger" : "ok"} />
            <Row label="Switch setting" value={torqueLimitValue(e.torqueLimit).toFixed(2)} tone="warn" />
            <Row label="Open limit" value={s.stroke >= 0.995 ? "made" : "clear"} tone={s.stroke >= 0.995 ? "ok" : undefined} />
            <Row label="Close limit" value={s.stroke <= 0.005 ? "made" : "clear"} tone={s.stroke <= 0.005 ? "ok" : undefined} />
          </>
        ) : (
          <>
            <Row label="Output torque" value={e.outputTorque.toFixed(2)} tone="air" />
            <Row label="Torque limit" value={torqueLimitValue(e.torqueLimit).toFixed(2)} tone="warn" />
            <Row label="Selector" value={e.selector} />
          </>
        )}
        <Row label="Drive" value={e.handMode ? "hand" : "motor"} />
        {isMultiTurn(s.config.family) && <Row label="Stem thrust" value={(e.outputTorque * MULTI_TURN.thrustFactor).toFixed(2)} tone="air" />}
      </dl>
      <ElectricTorqueChart family={s.config.family} torqueLimit={e.torqueLimit} obstruction={e.obstruction} position={s.position} outputTorque={e.outputTorque} className="mt-2" />
    </div>
  );
}

export function EngineeringOverlay() {
  const electric = useSimSelector((s) => isElectric(s.config.family));
  return electric ? <ElectricEngineering /> : <PneumaticEngineering />;
}

function PneumaticEngineering() {
  const s = useSimState();
  const sr = s.config.actionType === "spring-return";
  const t = s.torque;
  return (
    <div className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-sans text-[13px] font-semibold text-fg">Engineering view</h3>
        <Illustrative>Illustrative, not certified</Illustrative>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 divide-rule border-y border-rule py-1">
        <Row label="Valve position" value={`${(s.position * 100).toFixed(1)}`} unit="%" />
        <Row label="Output angle" value={s.outputAngle.toFixed(1)} unit="°" />
        {isGas(s.config.family) ? (
          <>
            <Row label="Pipeline" value={s.gas.pipeline.toFixed(1)} unit="bar" tone={s.gas.ruptured ? "danger" : "air"} />
            <Row label="Reserve tank" value={s.gas.tank.toFixed(1)} unit="bar" tone="air" />
            <Row label="Rate of change" value={s.gas.rate.toFixed(2)} unit="bar/s" tone={-s.gas.rate > s.gas.setPoint ? "danger" : undefined} />
            {s.config.family === "gas-over-oil" && <Row label="Low trip at" value={s.gas.lowSet.toFixed(0)} unit="bar" tone={s.gas.pipeline < s.gas.lowSet ? "danger" : undefined} />}
            <Row label="Line break" value={s.gas.tripped ? (s.gas.tripCause === "low" ? "low P" : "tripped") : s.gas.armed ? "armed" : "off"} tone={s.gas.tripped ? "danger" : s.gas.armed ? "ok" : "warn"} />
          </>
        ) : (
          <Row label="Supply" value={s.supplyAvailable ? s.supplyPressure.toFixed(1) : "0.0"} unit="bar" tone={s.supplyAvailable ? "air" : "danger"} />
        )}
        <Row label="Chamber A" value={s.chamberA} tone={s.chamberA === "supply" ? "air" : undefined} />
        <Row label="Air torque" value={t.air.toFixed(2)} tone="air" />
        <Row label="Chamber B" value={s.chamberB} tone={s.chamberB === "supply" ? "air" : undefined} />
        {sr && <Row label="Spring torque" value={t.spring.toFixed(2)} tone="warn" />}
        <Row label="Valve demand" value={t.valveDemand.toFixed(2)} />
        <Row label="Margin" value={t.net.toFixed(2)} tone={t.net > 0 ? "ok" : "danger"} />
      </dl>
      <TorqueChart config={s.config} pressure={isGas(s.config.family) ? pipelineToModel(s.gas.tank) : s.supplyPressure} position={s.position} className="mt-2" />
    </div>
  );
}
