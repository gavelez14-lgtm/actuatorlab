import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui/primitives";
import { Curriculum } from "./Curriculum";

export const metadata: Metadata = { title: "Academy" };

export default function AcademyPage() {
  return (
    <Page>
      <PageHeader
        title="Academy"
        lead="A path from what an actuator is to how it is sized. Seven lessons are available now. The rest are listed so you can see where the path leads."
      />
      <Curriculum />
    </Page>
  );
}
