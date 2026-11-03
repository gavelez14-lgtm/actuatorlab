import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ASSESSMENTS, ASSESSMENT_MAP } from "@/data/assessments";
import { Page } from "@/components/ui/primitives";
import { QuizRunner } from "./QuizRunner";

export function generateStaticParams() {
  return ASSESSMENTS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/assessments/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: ASSESSMENT_MAP[slug]?.title ?? "Assessment" };
}

async function AssessmentPageContent({ params }: { params: PageProps<"/assessments/[slug]">["params"] }) {
  const { slug } = await params;
  const a = ASSESSMENT_MAP[slug];
  if (!a) notFound();
  return (
    <Page className="max-w-3xl">
      <QuizRunner slug={a.slug} />
    </Page>
  );
}

export default function AssessmentPage(props: PageProps<"/assessments/[slug]">) {
  return (
    <Suspense fallback={<div className="p-10 text-[13px] text-muted">Loading</div>}>
      <AssessmentPageContent params={props.params} />
    </Suspense>
  );
}
