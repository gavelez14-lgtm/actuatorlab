"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { ASSESSMENT_MAP } from "@/data/assessments";
import { LESSON_MAP } from "@/data/lessons";
import { useProgress } from "@/lib/progress";
import { Button, ButtonLink, ProgressBar, Tag } from "@/components/ui/primitives";
import { QuestionCard } from "@/components/learn/QuestionCard";

export function QuizRunner({ slug }: { slug: string }) {
  const a = ASSESSMENT_MAP[slug];
  const { recordQuiz, touchRecent, data } = useProgress();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = a.questions[index];
  const total = a.questions.length;
  const answeredCount = Object.keys(answers).length;
  const score = a.questions.filter((x) => answers[x.id] === x.answer).length;
  const prevBest = data.quizzes[slug];

  const finish = () => {
    recordQuiz(slug, score, total);
    touchRecent({ id: `quiz-${slug}`, title: `${a.title} assessment`, href: `/assessments/${slug}` });
    setFinished(true);
  };

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setFinished(false);
  };

  return (
    <div>
      <Link href="/assessments" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" aria-hidden /> Assessments
      </Link>
      <div className="mb-2 flex items-center gap-2">
        <Tag>{a.level}</Tag>
        {prevBest && <span className="num text-[12.5px] text-muted">Previous best {prevBest.best} of {prevBest.total}</span>}
      </div>
      <h1 className="text-[36px] text-fg">{a.title}</h1>
      <p className="mt-1 text-[15px] text-fg-2">{a.description}</p>

      {!finished ? (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between text-[13px] text-muted">
            <span className="num">
              Question {index + 1} of {total}
            </span>
            <span className="num">{answeredCount} answered</span>
          </div>
          <ProgressBar value={answeredCount / total} label="Assessment progress" className="mb-5" />
          <QuestionCard key={q.id} q={q} index={index} chosen={answers[q.id]} onChoose={(c) => setAnswers((s) => ({ ...s, [q.id]: c }))} />
          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft aria-hidden /> Previous
            </Button>
            {index < total - 1 ? (
              <Button variant="secondary" disabled={answers[q.id] === undefined} onClick={() => setIndex((i) => i + 1)}>
                Next question <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button variant="primary" disabled={answeredCount < total} onClick={finish}>
                See results
              </Button>
            )}
          </div>
        </div>
      ) : (
        <section className="mt-8 rounded-2xl bg-panel p-6" aria-live="polite">
          <p className="text-[13px] text-muted">Your score</p>
          <p className="num font-display text-[56px] font-semibold leading-none text-fg">
            {score}
            <span className="text-[28px] text-muted"> / {total}</span>
          </p>
          <p className="mt-3 text-[15px] text-fg-2">
            {score / total >= a.passMark
              ? "Pass. You have a solid grasp of this material."
              : `Below the ${Math.round(a.passMark * 100)}% pass mark. Review the explanations, then try again.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={restart}>
              <RotateCcw aria-hidden /> Retake
            </Button>
            <ButtonLink href="/assessments" variant="secondary">
              All assessments
            </ButtonLink>
          </div>
          <div className="mt-6 border-t border-rule pt-4">
            <p className="mb-2 text-[13px] font-medium text-fg">Review the lessons</p>
            <ul className="flex flex-wrap gap-2">
              {a.relatedLessons.map((s) => (
                <li key={s}>
                  <Link href={`/academy/${s}`} className="inline-flex rounded-full bg-fill px-3 py-1 text-[13px] text-fg-2 hover:bg-fill-2 hover:text-fg">
                    {LESSON_MAP[s]?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-[13px] font-medium text-fg">Answers</p>
            {a.questions.map((x, i) => (
              <QuestionCard key={x.id} q={x} index={i} chosen={answers[x.id]} onChoose={() => {}} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
