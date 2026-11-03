"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock, Lock } from "lucide-react";
import { LESSONS, AVAILABLE_LESSONS, type Level } from "@/data/lessons";
import { useProgress } from "@/lib/progress";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const LEVELS: { level: Level; blurb: string }[] = [
  { level: "Beginner", blurb: "What actuators do, how they are powered, and how quarter-turn valves work." },
  { level: "Intermediate", blurb: "The mechanisms inside pneumatic actuators and how they fail safe." },
  { level: "Advanced", blurb: "Torque, sizing, mounting and the accessories around the actuator." },
];

export function Curriculum() {
  const { data } = useProgress();
  const completed = AVAILABLE_LESSONS.filter((l) => data.completedLessons[l.slug]).length;

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2 sm:max-w-md">
        <div className="flex items-baseline justify-between text-[13.5px]">
          <span className="text-fg-2">Available lessons completed</span>
          <span className="num font-medium text-fg">
            {completed} / {AVAILABLE_LESSONS.length}
          </span>
        </div>
        <ProgressBar value={completed / AVAILABLE_LESSONS.length} label="Academy progress" />
        {data.seeded && <p className="text-[12px] text-muted">Includes sample progress for the demo. Reset it from the Dashboard.</p>}
      </div>

      {LEVELS.map(({ level, blurb }) => (
        <section key={level} aria-labelledby={`lvl-${level}`}>
          <div className="mb-4 grid gap-1 md:grid-cols-[220px_1fr] md:gap-8">
            <h2 id={`lvl-${level}`} className="text-[26px] text-fg">
              {level}
            </h2>
            <p className="max-w-[60ch] self-end text-[14px] text-muted">{blurb}</p>
          </div>
          <ol className="divide-y divide-rule overflow-hidden rounded-2xl bg-panel md:ml-[252px]">
            {LESSONS.filter((l) => l.level === level).map((l) => {
              const available = l.status === "available";
              const done = !!data.completedLessons[l.slug];
              return (
                <li key={l.slug}>
                  <Link
                    href={`/academy/${l.slug}`}
                    className={cn("grid grid-cols-[28px_1fr_auto] items-start gap-3 px-4 py-3.5 transition-colors hover:bg-panel-2", !available && "text-muted")}
                  >
                    <span className="num pt-0.5 text-[14px] text-muted">{String(l.number).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className={cn("block text-[15px] font-medium", available ? "text-fg" : "text-muted")}>{l.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">{l.summary}</span>
                    </span>
                    <span className="flex items-center gap-2 pt-0.5">
                      {available ? (
                        <>
                          {l.minutes && (
                            <span className="hidden items-center gap-1 text-[12.5px] text-muted sm:inline-flex">
                              <Clock className="size-3.5" aria-hidden />
                              {l.minutes} min
                            </span>
                          )}
                          {done ? (
                            <CheckCircle2 className="size-[18px] text-ok" aria-label="Completed" />
                          ) : (
                            <Circle className="size-[18px] text-rule-strong" aria-label="Not started" />
                          )}
                        </>
                      ) : (
                        <Tag tone="neutral">
                          <Lock className="size-3" aria-hidden /> Coming soon
                        </Tag>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
