import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui/primitives";
import { AssessmentList } from "./AssessmentList";

export const metadata: Metadata = { title: "Knowledge Assessments" };

export default function AssessmentsPage() {
  return (
    <Page>
      <PageHeader
        title="Knowledge assessments"
        lead="Multiple-choice checks with an explanation after every answer. Scores are saved in this browser."
      />
      <AssessmentList />
    </Page>
  );
}
