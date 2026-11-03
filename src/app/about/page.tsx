import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "About and sources" };

const sections: { title: string; body: string[] }[] = [
  {
    title: "Independent and educational",
    body: [
      "ActuatorLab is an independent educational project. It is not affiliated with, endorsed by or sponsored by any actuator or valve manufacturer. Content is organised by technology, not by product range. Any trademarks belong to their owners.",
    ],
  },
  {
    title: "What the 3D model is",
    body: [
      "The simulator uses original procedural geometry generated in code. Proportions were chosen so the mechanism reads clearly and stays mechanically consistent through the stroke. It is not a manufacturing model, does not reproduce any manufacturer's dimensions or internal geometry, and no proprietary CAD, drawings or photographs were used.",
    ],
  },
  {
    title: "What the numbers are",
    body: [
      "Supply pressure range, spring preload and rate, valve torque demand and stroke time are illustrative values chosen to show behaviour. Torque is normalised. Do not use any value in ActuatorLab for sizing or selection.",
      "The one relationship taken from engineering texts is the symmetric Scotch yoke lever relation T = F·d / cos²φ. Everything else is labelled illustrative where it appears.",
      "Air flow visualisation shows direction of air movement in an illustrative circuit. It is not computational fluid dynamics and does not represent flow rate.",
    ],
  },
  {
    title: "Manufacturer-specific information",
    body: [
      "No product ratings, torque outputs, pressure limits, sizes or option lists are shown for any actuator type. Those differ between manufacturers and models, and must come from the specific manufacturer's documentation.",
    ],
  },
  {
    title: "Your data",
    body: ["Learning progress is stored in your browser's local storage. There is no account, and nothing is sent to a server."],
  },
];

export default function AboutPage() {
  return (
    <Page className="max-w-3xl">
      <PageHeader title="About and sources" lead="How ActuatorLab handles accuracy, sources and your data." />
      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-2 text-[24px] text-fg">{s.title}</h2>
            <div className="prose-lab text-[15px] leading-[1.7]">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
