import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Box, FileWarning, Hourglass } from "lucide-react";
import { FAMILIES, FAMILY_MAP } from "@/data/actuators";
import { LESSON_MAP } from "@/data/lessons";
import type { ActuatorFamilyId } from "@/lib/sim/types";
import { ButtonLink, Page, Panel, Tag } from "@/components/ui/primitives";
import { TrackVisit } from "@/components/learn/TrackVisit";

export function generateStaticParams() {
  return FAMILIES.map((f) => ({ slug: f.id }));
}

export async function generateMetadata({ params }: PageProps<"/explorer/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = FAMILY_MAP[slug as ActuatorFamilyId];
  return { title: f ? `${f.code} ${f.name}` : "Actuator" };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-rule pl-3">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="text-[15px] font-medium text-fg">{value}</dd>
    </div>
  );
}

async function FamilyPageContent({ params }: { params: PageProps<"/explorer/[slug]">["params"] }) {
  const { slug } = await params;
  const f = FAMILY_MAP[slug as ActuatorFamilyId];
  if (!f) notFound();
  const live = f.status === "interactive";

  return (
    <Page>
      <TrackVisit id={`family-${f.id}`} title={`${f.code} ${f.name}`} href={`/explorer/${f.id}`} />
      <Link href="/explorer" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" aria-hidden /> Actuator explorer
      </Link>

      <header className="mb-10 grid gap-6 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-baseline gap-4">
            <span className="font-display text-[64px] font-semibold leading-none text-fg sm:text-[80px]">{f.code}</span>
            {live ? <Tag tone="live">Interactive simulation</Tag> : <Tag>Simulation coming soon</Tag>}
          </div>
          <h1 className="mt-2 text-[28px] text-fg-2">{f.name}</h1>
          <p className="mt-2 max-w-[62ch] text-[16px] text-fg-2">{f.summary}</p>
        </div>
        {live ? (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/simulator" variant="primary" size="lg">
              <Box aria-hidden /> Launch simulator
            </ButtonLink>
            <ButtonLink href="/simulator?mode=mechanical" variant="secondary" size="lg">
              See the mechanism
            </ButtonLink>
          </div>
        ) : (
          <div className="flex max-w-xs items-start gap-2.5 rounded-xl bg-fill p-3 text-[13px] text-muted">
            <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>No working simulation yet. It will be added once the mechanism model is built and checked.</span>
          </div>
        )}
      </header>

      <dl className="mb-12 grid grid-cols-2 gap-5 md:grid-cols-4">
        <Fact label="Technology" value={f.technology} />
        <Fact label="Power source" value={f.powerSource} />
        <Fact label="Movement" value={f.movement} />
        <Fact label="Configurations" value={f.configurations.map((c) => c.name).join(", ")} />
      </dl>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-[26px] text-fg">Basic operation</h2>
            <ol className="space-y-3">
              {f.operation.map((o, i) => (
                <li key={o} className="grid grid-cols-[28px_1fr] gap-2 text-[15px] text-fg-2">
                  <span className="num font-display text-[18px] font-semibold text-muted">{i + 1}</span>
                  <span>{o}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-[26px] text-fg">Available configurations</h2>
            <p className="mb-3 text-[13px] text-muted">General configurations for this technology class, not a product option list.</p>
            <ul className="divide-y divide-rule rounded-2xl bg-panel">
              {f.configurations.map((c) => (
                <li key={c.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                  <span className="text-[14.5px] font-medium text-fg">{c.name}</span>
                  <span className="text-[14px] text-fg-2">{c.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[26px] text-fg">General engineering principles</h2>
            <p className="mb-3 text-[13px] text-muted">These apply to the technology class in general, not to any one manufacturer.</p>
            <ul className="space-y-2">
              {f.principles.map((p) => (
                <li key={p} className="flex gap-2.5 text-[15px] text-fg-2">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-rule-strong" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <Panel className="p-5">
            <h2 className="text-[19px] text-fg">Learning objectives</h2>
            <ul className="mt-3 space-y-2">
              {f.objectives.map((o) => (
                <li key={o} className="flex gap-2.5 text-[14px] text-fg-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {o}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h2 className="flex items-center gap-2 text-[19px] text-fg">
              <FileWarning className="size-4 text-warn" aria-hidden /> Manufacturer-specific data
            </h2>
            <p className="mt-2 text-[13.5px] text-fg-2">{f.manufacturer.note}</p>
            <p className="mt-2 text-[12.5px] text-muted">Status: not verified in this build.</p>
          </Panel>

          {f.relatedLessons.length > 0 && (
            <Panel className="p-5">
              <h2 className="text-[19px] text-fg">Related lessons</h2>
              <ul className="mt-2 divide-y divide-rule">
                {f.relatedLessons.map((s) => {
                  const l = LESSON_MAP[s];
                  if (!l) return null;
                  return (
                    <li key={s}>
                      <Link href={`/academy/${s}`} className="flex items-center justify-between gap-3 py-2 text-[14px] text-fg-2 hover:text-fg">
                        {l.title}
                        {l.status !== "available" && <Tag>Soon</Tag>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </Page>
  );
}

export default function FamilyPage(props: PageProps<"/explorer/[slug]">) {
  return (
    <Suspense fallback={<div className="p-10 text-[13px] text-muted">Loading</div>}>
      <FamilyPageContent params={props.params} />
    </Suspense>
  );
}
