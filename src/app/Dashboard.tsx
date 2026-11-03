"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, History, RotateCcw } from "lucide-react";
import { FAMILIES } from "@/data/actuators";
import { AVAILABLE_LESSONS, LESSON_MAP, LESSONS } from "@/data/lessons";
import { ASSESSMENTS } from "@/data/assessments";
import { useProgress } from "@/lib/progress";
import { useMounted } from "@/lib/hooks";
import { ScrollStory } from "@/components/sim/ScrollStory";
import { Button, ButtonLink, ChevronLink, Page, ProgressBar, SectionTitle, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";



function relativeDay(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function Dashboard() {
  const { data, reset } = useProgress();
  const mounted = useMounted();
  const completed = AVAILABLE_LESSONS.filter((l) => data.completedLessons[l.slug]);
  const nextLesson =
    (data.lastLesson && LESSON_MAP[data.lastLesson] && !data.completedLessons[data.lastLesson] ? LESSON_MAP[data.lastLesson] : null) ??
    AVAILABLE_LESSONS.find((l) => !data.completedLessons[l.slug]) ??
    null;
  const recommended = AVAILABLE_LESSONS.filter((l) => !data.completedLessons[l.slug] && l.slug !== nextLesson?.slug).slice(0, 3);
  const quizzesTaken = ASSESSMENTS.filter((a) => data.quizzes[a.slug]);
  const lessonPct = completed.length / AVAILABLE_LESSONS.length;

  return (
    <>
    <Page className="max-w-[1320px] pb-0 lg:pb-0">
      {/* Opening spread: one statement, set large, with the practical next steps beside it */}
      <section aria-labelledby="hero" className="grid gap-8 pb-14 pt-6 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-20 lg:pt-16">
        <h1 id="hero" className="text-[52px] leading-[0.95] tracking-[-0.045em] text-fg sm:text-[88px] lg:col-span-12 lg:text-[128px]">
          Understand the mechanism.
        </h1>
        <div className="lg:col-span-5 lg:col-start-8">
          <p className="max-w-[36ch] text-[17px] leading-[1.45] text-fg-2">
            Visualize the movement. Master the application. ActuatorLab teaches industrial valve actuators with a live 3D model you can open, cut away and stress.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/simulator" variant="primary" size="lg">
              Open the simulator
            </ButtonLink>
            <ChevronLink href="/academy" className="text-[17px]">
              Start learning
            </ChevronLink>
          </div>
          <p className="mt-6 text-[13px] text-muted">Scroll to run one stroke of the actuator.</p>
        </div>
      </section>
    </Page>

    <ScrollStory />

    <Page className="max-w-[1320px] lg:pt-24">

      <div className="mb-20 grid gap-5 lg:grid-cols-2">
          <section aria-labelledby="continue" className="rounded-2xl bg-panel p-6">
            <h2 id="continue" className="text-[20px] text-fg">
              Continue learning
            </h2>
            {!mounted ? (
              <div className="mt-4 h-24 animate-pulse rounded-md bg-panel-2" />
            ) : nextLesson ? (
              <Link href={`/academy/${nextLesson.slug}`} className="group mt-3 block rounded-xl bg-panel-2 p-4 hover:bg-fill-2">
                <div className="flex items-center gap-2 text-[12.5px] text-muted">
                  <span>Lesson {nextLesson.number}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {nextLesson.minutes} min
                  </span>
                </div>
                <div className="mt-1 text-[17px] font-medium text-fg">{nextLesson.title}</div>
                <p className="mt-1 text-[13px] text-muted">{nextLesson.summary}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-medium text-accent">
                  {data.lastLesson === nextLesson.slug ? "Resume" : "Start"} lesson <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ) : (
              <p className="mt-3 text-[14px] text-fg-2">All available lessons are complete. Try an assessment, or explore the simulator modes.</p>
            )}
          </section>

          <section aria-labelledby="progress" className="rounded-2xl bg-panel p-6">
            <div className="flex items-baseline justify-between">
              <h2 id="progress" className="text-[20px] text-fg">
                Learning progress
              </h2>
              {data.seeded && <Tag>Sample data</Tag>}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-fg-2">Lessons</span>
                  <span className="num text-fg">
                    {mounted ? completed.length : 0} of {AVAILABLE_LESSONS.length} available
                  </span>
                </div>
                <ProgressBar value={mounted ? lessonPct : 0} label="Lessons completed" />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-fg-2">Assessments</span>
                  <span className="num text-fg">
                    {mounted ? quizzesTaken.length : 0} of {ASSESSMENTS.length} taken
                  </span>
                </div>
                <ProgressBar value={mounted ? quizzesTaken.length / ASSESSMENTS.length : 0} label="Assessments taken" />
              </div>
              <p className="text-[12px] text-muted">
                {LESSONS.length - AVAILABLE_LESSONS.length} more lessons are planned. Progress is stored only in this browser.
              </p>
              <div className="flex flex-wrap gap-1 border-t border-rule pt-3">
                <Button variant="ghost" size="sm" onClick={() => reset("empty")}>
                  <RotateCcw aria-hidden /> Clear progress
                </Button>
                <Button variant="ghost" size="sm" onClick={() => reset("sample")}>
                  Load sample progress
                </Button>
              </div>
            </div>
          </section>
      </div>

      {/* Families */}
      <section aria-labelledby="families" className="mb-20">
        <SectionTitle id="families" action={<ChevronLink href="/explorer" className="text-[15px]">Explore all</ChevronLink>}>
          The lineup
        </SectionTitle>
        <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-7">
          {FAMILIES.map((f) => (
            <li key={f.id} className="w-[150px] shrink-0 snap-start sm:w-auto">
              <Link href={`/explorer/${f.id}`} className="flex h-full flex-col rounded-2xl bg-panel p-5 transition-colors hover:bg-panel-2">
                <span className="font-display text-[28px] font-semibold leading-none tracking-[-0.03em] text-fg">{f.code.replace("Skilmatic ", "")}</span>
                <span className="mt-3 text-[13px] leading-snug text-fg-2">{f.technology}</span>
                {f.powerSource !== f.technology && <span className="text-[13px] text-muted">{f.powerSource}</span>}
                <span className={cn("mt-4 text-[12px] font-medium", f.status === "interactive" ? "text-accent" : "text-muted")}>
                  {f.status === "interactive" ? "Interactive" : "Coming soon"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent + recommended */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="recent">
          <SectionTitle id="recent">Recently explored</SectionTitle>
          {!mounted ? null : data.recent.length === 0 ? (
            <div className="rounded-2xl bg-panel p-5 text-[14px] text-muted">
              Nothing yet. Open a lesson or the simulator and it will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-rule rounded-2xl bg-panel">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-panel-2">
                    <span className="flex items-center gap-3 text-[14.5px] text-fg">
                      <History className="size-4 text-muted" aria-hidden />
                      {r.title}
                    </span>
                    <span className="shrink-0 text-[12.5px] text-muted">{relativeDay(r.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recommended">
          <SectionTitle
            id="recommended"
            action={
              <ChevronLink href="/academy" className="text-[15px]">Full curriculum</ChevronLink>
            }
          >
            Recommended lessons
          </SectionTitle>
          {!mounted ? null : recommended.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl bg-panel p-5 text-[14px] text-fg-2">
              <CheckCircle2 className="size-4 text-ok" aria-hidden /> You have covered every available lesson.
            </div>
          ) : (
            <ul className="divide-y divide-rule rounded-2xl bg-panel">
              {recommended.map((l) => (
                <li key={l.slug}>
                  <Link href={`/academy/${l.slug}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-panel-2">
                    <span>
                      <span className="block text-[14.5px] font-medium text-fg">{l.title}</span>
                      <span className="block text-[12.5px] text-muted">
                        {l.level}, {l.minutes} min
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
    </>
  );
}
