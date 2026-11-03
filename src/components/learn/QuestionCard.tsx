"use client";

import { Check, X } from "lucide-react";
import type { Question } from "@/data/lessons";
import { cn } from "@/lib/utils";

/**
 * A single multiple-choice question. Once answered, it locks, marks the
 * correct option and shows the explanation.
 */
export function QuestionCard({
  q,
  index,
  chosen,
  onChoose,
}: {
  q: Question;
  index: number;
  chosen: number | undefined;
  onChoose: (i: number) => void;
}) {
  const answered = chosen !== undefined;
  const correct = chosen === q.answer;
  const name = `q-${q.id}`;
  return (
    <fieldset className="rounded-2xl bg-panel p-4 sm:p-5">
      <legend className="sr-only">Question {index + 1}</legend>
      <p className="mb-3 text-[15.5px] font-medium text-fg">
        <span className="num mr-2 text-muted">{index + 1}.</span>
        {q.prompt}
      </p>
      <div className="grid gap-2" role="radiogroup" aria-label={q.prompt}>
        {q.options.map((opt, i) => {
          const isChosen = chosen === i;
          const isAnswer = q.answer === i;
          return (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl px-3.5 py-3 text-[15px] transition-colors",
                !answered && "bg-panel-2 hover:bg-fill-2",
                answered && isAnswer && "bg-ok/15 text-fg",
                answered && isChosen && !isAnswer && "bg-danger/15 text-fg",
                answered && !isChosen && !isAnswer && "bg-panel-2 text-muted",
                answered && "cursor-default",
              )}
            >
              <input
                type="radio"
                name={name}
                className="mt-1 accent-[var(--accent)]"
                checked={isChosen}
                disabled={answered}
                onChange={() => onChoose(i)}
              />
              <span className="flex-1">{opt}</span>
              {answered && isAnswer && <Check className="mt-0.5 size-4 text-ok" aria-label="Correct answer" />}
              {answered && isChosen && !isAnswer && <X className="mt-0.5 size-4 text-danger" aria-label="Your answer" />}
            </label>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 border-l-2 pl-3 text-[13.5px] text-fg-2" style={{ borderColor: correct ? "var(--ok)" : "var(--danger)" }} role="status">
          <span className={cn("font-semibold", correct ? "text-ok" : "text-danger")}>{correct ? "Correct. " : "Not quite. "}</span>
          {q.explanation}
        </div>
      )}
    </fieldset>
  );
}

/** Render **bold** markers in lesson text without a markdown dependency. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}
