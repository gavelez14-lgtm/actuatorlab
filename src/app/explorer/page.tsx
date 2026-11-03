import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui/primitives";
import { ExplorerList } from "./ExplorerList";
import { VALVES } from "@/data/valves";
import { Tag } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Actuator Explorer" };

export default function ExplorerPage() {
  return (
    <Page>
      <PageHeader
        title="Actuator explorer"
        lead="Actuator families in the training scope, grouped by technology and power source. Only the CP-style Scotch yoke has a working simulation so far. The others are marked as planned."
      />
      <ExplorerList />

      <section aria-labelledby="valves" className="mt-14">
        <h2 id="valves" className="mb-1 text-[26px] text-fg">
          Quarter-turn valves
        </h2>
        <p className="mb-4 max-w-[64ch] text-[14px] text-muted">
          The actuator-to-valve interface is a single rotation, so new valve models plug into the same output shaft.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {VALVES.map((v) => (
            <article key={v.id} className="rounded-2xl bg-panel p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[20px] text-fg">{v.name}</h3>
                {v.status === "interactive" ? <Tag tone="live">In simulator</Tag> : <Tag>Coming soon</Tag>}
              </div>
              <p className="mt-2 text-[14px] text-fg-2">{v.closure}</p>
              <p className="mt-2 text-[13px] text-muted">{v.description}</p>
              <p className="mt-3 border-t border-rule pt-3 text-[12.5px] text-muted">
                <span className="font-medium text-fg-2">Torque: </span>
                {v.torqueNote}
              </p>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
