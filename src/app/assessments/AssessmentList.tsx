"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ASSESSMENTS } from "@/data/assessments";
import { LESSON_MAP } from "@/data/lessons";
import { useProgress } from "@/lib/progress";
import { Tag } from "@/components/ui/primitives";

export function AssessmentList() {
  const { data } = useProgress();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ASSESSMENTS.map((a) => {
        const r = data.quizzes[a.slug];
        const passed = r && r.best / r.total >= a.passMark;
        return (
          <Link key={a.slug} href={`/assessments/${a.slug}`} className="group flex flex-col rounded-2xl bg-panel p-5 transition-colors hover:bg-panel-2">
            <div className="flex items-center gap-2">
              <Tag>{a.level}</Tag>
              <span className="text-[12.5px] text-muted">{a.questions.length} questions</span>
              {r && <Tag tone={passed ? "ok" : "warn"}>{passed ? "Passed" : "Attempted"}</Tag>}
            </div>
            <h2 className="mt-3 text-[24px] text-fg">{a.title}</h2>
            <p className="mt-1 text-[14px] text-fg-2">{a.description}</p>
            <p className="mt-3 text-[12.5px] text-muted">Based on: {a.relatedLessons.map((s) => LESSON_MAP[s]?.title).join(", ")}</p>
            <div className="mt-auto flex items-center justify-between border-t border-rule pt-4 text-[13.5px]">
              <span className="num text-fg-2">
                {r ? `Best ${r.best} of ${r.total}, ${r.attempts} attempt${r.attempts === 1 ? "" : "s"}` : `Pass mark ${Math.round(a.passMark * 100)}%`}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-fg group-hover:text-accent">
                {r ? "Retake" : "Start"} <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
