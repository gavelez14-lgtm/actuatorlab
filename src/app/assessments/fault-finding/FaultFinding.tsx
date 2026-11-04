"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { FAULTS } from "@/data/faults";
import { LESSON_MAP } from "@/data/lessons";
import { useProgress } from "@/lib/progress";
import { EmbeddedSim } from "@/components/learn/EmbeddedSim";
import { Button, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const FAULT_FINDING_SLUG = "fault-finding";

export function FaultFinding() {
  const { recordQuiz } = useProgress();
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [hint, setHint] = useState<Record<string, boolean>>({});
  const f = FAULTS[index];
  const done = FAULTS.every((x) => submitted[x.id]);
  const score = FAULTS.filter((x) => submitted[x.id] && choice[x.id] === x.answer).length;
  const isSubmitted = !!submitted[f.id];
  const correct = choice[f.id] === f.answer;

  const submit = () => {
    const next = { ...submitted, [f.id]: true };
    setSubmitted(next);
    if (FAULTS.every((x) => next[x.id])) {
      recordQuiz(FAULT_FINDING_SLUG, FAULTS.filter((x) => choice[x.id] === x.answer).length, FAULTS.length);
    }
  };

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Jobs">
        {FAULTS.map((x, i) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors",
                i === index ? "bg-fg text-bg" : "bg-fill text-fg-2 hover:text-fg",
              )}
            >
              {submitted[x.id] ? choice[x.id] === x.answer ? <Check className="size-3.5" aria-label="correct" /> : <X className="size-3.5" aria-label="incorrect" /> : <span className="num">{i + 1}</span>}
              {x.title}
            </button>
          </li>
        ))}
      </ol>

      <section aria-labelledby="job-title" className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <EmbeddedSim
            key={f.id}
            config={f.config}
            mode={f.mode ?? "normal"}
            setup={f.setup}
            extras={f.extras ?? []}
            supplyToggle
            hideStatus={!isSubmitted}
            instruments
            ariaLabel={`Fault-finding job: ${f.title}`}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag>{f.level}</Tag>
            <span className="text-[12.5px] text-muted">
              Job {index + 1} of {FAULTS.length}
            </span>
          </div>
          <h2 id="job-title" className="text-[26px] text-fg">
            {f.title}
          </h2>
          <blockquote className="rounded-xl border-l-2 border-accent bg-panel px-4 py-3 text-[14.5px] text-fg-2">{f.report}</blockquote>

          {hint[f.id] ? (
            <p className="flex items-start gap-2 text-[13.5px] text-muted">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {f.hint}
            </p>
          ) : (
            !isSubmitted && (
              <Button size="sm" variant="ghost" onClick={() => setHint((h) => ({ ...h, [f.id]: true }))}>
                <Lightbulb aria-hidden /> Hint
              </Button>
            )
          )}

          <fieldset className="space-y-2" disabled={isSubmitted}>
            <legend className="mb-1 text-[13px] font-medium text-fg">Most likely cause</legend>
            {f.options.map((o, i) => {
              const picked = choice[f.id] === i;
              const show = isSubmitted && (i === f.answer || picked);
              return (
                <label
                  key={o}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
                    show && i === f.answer ? "bg-ok/12 text-fg" : show && picked ? "bg-danger/10 text-fg" : picked ? "bg-accent-soft text-fg" : "bg-panel text-fg-2 hover:bg-panel-2",
                  )}
                >
                  <input type="radio" name={`fault-${f.id}`} className="mt-1 accent-[var(--accent)]" checked={picked} onChange={() => setChoice((c) => ({ ...c, [f.id]: i }))} />
                  {o}
                </label>
              );
            })}
          </fieldset>

          {!isSubmitted ? (
            <Button variant="primary" disabled={choice[f.id] === undefined} onClick={submit}>
              Submit diagnosis
            </Button>
          ) : (
            <div className="space-y-3" aria-live="polite">
              <p className={cn("text-[15px] font-medium", correct ? "text-ok" : "text-danger")}>{correct ? "Correct." : "Not quite."}</p>
              <p className="text-[14px] leading-relaxed text-fg-2">{f.explanation}</p>
              <p className="text-[13px] text-muted">
                The status line is now shown under the model. Background:{" "}
                <Link href={`/academy/${f.lesson}`} className="text-fg underline decoration-rule-strong underline-offset-2 hover:decoration-accent">
                  {LESSON_MAP[f.lesson]?.title ?? "Academy"}
                </Link>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-rule pt-4">
            <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft aria-hidden /> Previous
            </Button>
            {done ? (
              <span className="num text-[14px] text-fg">
                Score {score} of {FAULTS.length}
              </span>
            ) : (
              <span className="text-[12.5px] text-muted">{Object.keys(submitted).length} of {FAULTS.length} diagnosed</span>
            )}
            <Button size="sm" variant="ghost" disabled={index === FAULTS.length - 1} onClick={() => setIndex((i) => i + 1)}>
              Next <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
