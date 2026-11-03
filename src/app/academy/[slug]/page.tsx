import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hourglass } from "lucide-react";
import { LESSONS, LESSON_MAP } from "@/data/lessons";
import { Page, Tag, ButtonLink } from "@/components/ui/primitives";
import { LessonView } from "@/components/learn/LessonView";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/academy/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = LESSON_MAP[slug];
  return { title: l ? l.title : "Lesson" };
}

async function LessonPageContent({ params }: { params: PageProps<"/academy/[slug]">["params"] }) {
  const { slug } = await params;
  const lesson = LESSON_MAP[slug];
  if (!lesson) notFound();

  if (lesson.status !== "available") {
    return (
      <Page className="max-w-3xl">
        <Link href="/academy" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden /> Academy
        </Link>
        <div className="mb-2 flex gap-2">
          <Tag>{lesson.level}</Tag>
          <Tag>Lesson {lesson.number}</Tag>
          <Tag tone="warn">Coming soon</Tag>
        </div>
        <h1 className="text-[36px] text-fg">{lesson.title}</h1>
        <p className="mt-2 text-[16px] text-fg-2">{lesson.summary}</p>
        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-panel p-5">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <div>
            <p className="font-medium text-fg">This lesson has not been written yet.</p>
            <p className="mt-1 text-[14px] text-muted">It is on the curriculum so you can see where the path leads. It cannot be completed until its content is published.</p>
            <ButtonLink href="/academy" variant="secondary" size="sm" className="mt-4">
              Choose an available lesson
            </ButtonLink>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <LessonView lesson={lesson} />
    </Page>
  );
}

export default function LessonPage(props: PageProps<"/academy/[slug]">) {
  return (
    <Suspense fallback={<div className="p-10 text-[13px] text-muted">Loading</div>}>
      <LessonPageContent params={props.params} />
    </Suspense>
  );
}
