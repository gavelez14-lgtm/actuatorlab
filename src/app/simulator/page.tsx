import type { Metadata } from "next";
import { Suspense } from "react";
import { SimulatorFromQuery } from "./SimulatorFromQuery";

export const metadata: Metadata = {
  title: "3D Simulator",
  description: "Interactive pneumatic Scotch yoke actuator on a quarter-turn ball valve.",
};

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13px] text-muted">Loading simulator</div>}>
      <SimulatorFromQuery />
    </Suspense>
  );
}
