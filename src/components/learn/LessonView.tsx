"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, RotateCcw } from "lucide-react";
import type { Lesson } from "@/data/lessons";
import { neighbours } from "@/data/lessons";
import { useProgress } from "@/lib/progress";
import { Button, ButtonLink, Tag } from "@/components/ui/primitives";
import { LessonFigure } from "./Figures";
import { KeyFigure } from "./KeyFigure";
import { QuestionCard, RichText } from "./QuestionCard";

export function LessonView({ lesson }: { lesson: Lesson }) {
  const { data, completeLesson, uncompleteLesson, answerCheck, touchRecent, setLastLesson } = useProgress();
  const { prev, next } = neighbours(lesson.slug);
  const done = !!data.completedLessons[lesson.slug];
  const answers = data.lessonChecks[lesson.slug] ?? {};
  const checks = lesson.checks ?? [];
  const answeredAll = checks.every((q) => answers[q.id] !== undefined);
  const correct = checks.filter((q) => answers[q.id] === q.answer).length;

  useEffect(() => {
    touchRecent({ id: `lesson-${lesson.slug}`, title: lesson.title, href: `/academy/${lesson.slug}` });
    setLastLesson(lesson.slug);
  }, [lesson.slug, lesson.title, touchRecent, setLastLesson]);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
      <article className="min-w-0">
        <header className="mb-8 border-b border-rule pb-6">
          <Link href="/academy" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
            <ArrowLeft className="size-3.5" aria-hidden /> Academy
          </Link>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag>{lesson.level}</Tag>
            {lesson.minutes && (
              <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                <Clock className="size-3.5" aria-hidden /> {lesson.minutes} min
              </span>
            )}
            {done && <Tag tone="ok">Completed</Tag>}
          </div>
          <p className="num mt-6 font-display text-[clamp(56px,8vw,96px)] font-semibold leading-none tracking-[-0.05em] text-muted" aria-hidden>
            {String(lesson.number).padStart(2, "0")}
          </p>
          <h1 className="mt-2 text-[40px] leading-[1.02] tracking-[-0.04em] text-fg sm:text-[60px]">
            <span className="sr-only">Lesson {lesson.number}: </span>
            {lesson.title}
          </h1>
          <p className="mt-4 max-w-[52ch] text-[19px] leading-[1.45] text-fg-2">{lesson.summary}</p>
        </header>

        <section aria-labelledby="objectives" className="mb-10 rounded-2xl bg-panel p-5">
          <h2 id="objectives" className="text-[19px] text-fg">
            By the end you can
          </h2>
          <ul className="mt-3 space-y-2">
            {lesson.objectives?.map((o) => (
              <li key={o} className="flex gap-2.5 text-[14.5px] text-fg-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {o}
              </li>
            ))}
          </ul>
        </section>

        {lesson.sections?.map((s) => (
          <section key={s.heading} className="mb-10">
            <h2 className="mb-3 text-[26px] text-fg">{s.heading}</h2>
            <div className="prose-lab text-[15.5px] leading-[1.7]">
              {s.body.map((p) => (
                <p key={p}>
                  <RichText text={p} />
                </p>
              ))}
            </div>
            {s.stat && <KeyFigure value={s.stat.value} label={s.stat.label} />}
            {s.figure && <LessonFigure id={s.figure} />}
          </section>
        ))}

        {lesson.terms && (
          <section aria-labelledby="terms" className="mb-10">
            <h2 id="terms" className="mb-3 text-[26px] text-fg">
              Key terms
            </h2>
            <dl className="divide-y divide-rule rounded-2xl bg-panel">
              {lesson.terms.map((t) => (
                <div key={t.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="text-[14.5px] font-semibold text-fg">{t.term}</dt>
                  <dd className="text-[14.5px] text-fg-2">{t.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {checks.length > 0 && (
          <section aria-labelledby="check" className="mb-10">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="check" className="text-[26px] text-fg">
                Knowledge check
              </h2>
              {answeredAll && (
                <span className="num text-[14px] text-fg-2">
                  {correct} of {checks.length} correct
                </span>
              )}
            </div>
            <div className="space-y-3">
              {checks.map((q, i) => (
                <QuestionCard key={q.id} q={q} index={i} chosen={answers[q.id]} onChoose={(c) => answerCheck(lesson.slug, q.id, c)} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-2xl bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-medium text-fg">{done ? "Lesson complete" : answeredAll ? "Ready to mark this lesson complete" : "Answer the knowledge check to finish"}</p>
            <p className="text-[13px] text-muted">Progress is saved in this browser only.</p>
          </div>
          {done ? (
            <Button variant="ghost" onClick={() => uncompleteLesson(lesson.slug)}>
              <RotateCcw aria-hidden /> Mark as not complete
            </Button>
          ) : (
            <Button variant="primary" disabled={!answeredAll} onClick={() => completeLesson(lesson.slug)}>
              <CheckCircle2 aria-hidden /> Mark complete
            </Button>
          )}
        </section>

        <nav aria-label="Lesson navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={`/academy/${prev.slug}`} className="group rounded-2xl bg-panel p-4 hover:bg-panel-2">
              <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                <ArrowLeft className="size-3.5" aria-hidden /> Previous
              </span>
              <span className="mt-1 block font-medium text-fg">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/academy/${next.slug}`} className="group rounded-2xl bg-panel p-4 text-right hover:bg-panel-2">
              <span className="flex items-center justify-end gap-1.5 text-[12.5px] text-muted">
                Next <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-1 block font-medium text-fg">{next.title}</span>
            </Link>
          ) : (
            <ButtonLink href="/assessments" variant="secondary" className="h-auto justify-end p-4">
              Take an assessment <ArrowRight aria-hidden />
            </ButtonLink>
          )}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-10">
          <h2 className="mb-2 font-sans text-[13px] font-semibold text-fg">On this page</h2>
          <ul className="space-y-1.5 border-l border-rule pl-3 text-[13px] text-muted">
            {lesson.sections?.map((s) => (
              <li key={s.heading}>{s.heading}</li>
            ))}
            {lesson.terms && <li>Key terms</li>}
            {checks.length > 0 && <li>Knowledge check</li>}
          </ul>
          <div className="mt-6 flex items-center gap-2 text-[13px]">
            {done ? <CheckCircle2 className="size-4 text-ok" aria-hidden /> : <Circle className="size-4 text-muted" aria-hidden />}
            <span className={done ? "text-fg" : "text-muted"}>{done ? "Completed" : "Not completed"}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
