import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui/primitives";
import { FaultFinding } from "./FaultFinding";

export const metadata: Metadata = { title: "Fault-finding" };

export default function FaultFindingPage() {
  return (
    <Page>
      <PageHeader
        title="Fault-finding"
        lead="Each job loads a simulator with a hidden fault. Operate it, read the instruments, then name the cause. The status line is hidden: you have to work it out, like on site."
      />
      <FaultFinding />
    </Page>
  );
}
