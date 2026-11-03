import type { Metadata } from "next";
import { Box } from "lucide-react";
import { COMPARE_ROWS, MECHANISMS, type MechanismKey } from "@/data/compare";
import { ButtonLink, Illustrative, Page, PageHeader, Tag } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Compare Actuators" };

/** Normalised illustrative torque shapes: Scotch yoke 1/cos²φ vs constant rack-and-pinion output. */
function ShapeChart() {
  const W = 520;
  const H = 200;
  const pad = { l: 36, r: 12, t: 14, b: 30 };
  const x = (v: number) => pad.l + v * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 2.2) * (H - pad.t - pad.b);
  const sy: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const s = i / 60;
    const phi = (-45 + s * 90) * (Math.PI / 180);
    sy.push(`${i ? "L" : "M"}${x(s).toFixed(1)},${y(1 / Math.cos(phi) ** 2).toFixed(1)}`);
  }
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Normalised torque against stroke. The Scotch yoke curve is U-shaped from 2 down to 1 and back to 2. The rack and pinion line is flat at about 1.4.">
        {[0, 1, 2].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={t === 0 ? 1 : 0.6} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"} fontSize="11" fill="var(--muted)">
            {t === 0 ? "Start of stroke" : t === 1 ? "End of stroke" : "Mid-stroke"}
          </text>
        ))}
        <path d={sy.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.2} />
        <line x1={x(0)} x2={x(1)} y1={y(1.4)} y2={y(1.4)} stroke="var(--air)" strokeWidth={2.2} />
        <text x={x(0.5)} y={y(1) + 16} textAnchor="middle" fontSize="11.5" fill="var(--accent)">
          Scotch yoke
        </text>
        <text x={x(0.5)} y={y(1.4) - 7} textAnchor="middle" fontSize="11.5" fill="var(--air)">
          Rack and pinion
        </text>
      </svg>
      <figcaption className="mt-2 text-[12.5px] text-muted">
        Shapes only, same piston force. The Scotch yoke curve is normalised to 1 at mid-stroke. The rack-and-pinion level is placed arbitrarily: its height depends on pinion radius, not on this chart.
      </figcaption>
    </figure>
  );
}

export default function ComparePage() {
  const keys = Object.keys(MECHANISMS) as MechanismKey[];
  return (
    <Page>
      <PageHeader
        title="Scotch yoke and rack and pinion"
        lead="Two common ways to turn a piston's straight-line force into a quarter turn. This page compares typical characteristics of each mechanism, not any manufacturer's products."
      />

      <section aria-labelledby="shape" className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
        <div className="rounded-2xl bg-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="shape" className="text-[22px] text-fg">
              Torque shape across the stroke
            </h2>
            <Illustrative>Illustrative shapes</Illustrative>
          </div>
          <ShapeChart />
        </div>
        <div className="space-y-4 text-[15px] text-fg-2">
          <p>
            In a <strong className="text-fg">Scotch yoke</strong> the lever arm between the pin and the shaft grows toward the ends of travel. For a symmetric yoke, torque follows T = F·d / cos²φ, so it is twice as high at ±45° as at mid-stroke.
          </p>
          <p>
            In a <strong className="text-fg">rack and pinion</strong> the rack always acts at the pinion&apos;s pitch radius, so torque is roughly constant from start to end.
          </p>
          <p>Neither is better in general. The question is which shape matches the valve&apos;s torque demand with the smallest, most reliable actuator.</p>
        </div>
      </section>

      <section aria-labelledby="table">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="table" className="text-[26px] text-fg">
            Side by side
          </h2>
          <span className="text-[12.5px] text-muted">Typical engineering characteristics</span>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-panel">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule">
                <th scope="col" className="w-[200px] px-4 py-3 text-[12.5px] font-medium text-muted">
                  Aspect
                </th>
                {keys.map((k) => (
                  <th key={k} scope="col" className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[20px] font-semibold text-fg">{MECHANISMS[k].name}</span>
                      {MECHANISMS[k].simulator ? <Tag tone="live">Interactive</Tag> : <Tag>Simulation coming soon</Tag>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {COMPARE_ROWS.map((r) => (
                <tr key={r.aspect} className="align-top">
                  <th scope="row" className="px-4 py-3.5 text-[14px] font-medium text-fg">
                    {r.aspect}
                  </th>
                  {keys.map((k) => (
                    <td key={k} className="px-4 py-3.5 text-[14px] text-fg-2">
                      {r.values[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] text-muted">
          These are general characteristics of each mechanism. Torque outputs, sizes and ratings for any specific actuator must come from the manufacturer&apos;s documentation.
        </p>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-panel p-5">
          <h2 className="text-[20px] text-fg">Scotch yoke in 3D</h2>
          <p className="mt-1 text-[14px] text-fg-2">See the pin slide in the yoke slot and read the torque curve live.</p>
          <ButtonLink href="/simulator?mode=engineering" variant="primary" className="mt-4">
            <Box aria-hidden /> Open in engineering view
          </ButtonLink>
        </div>
        <div className="rounded-2xl bg-panel p-5">
          <h2 className="text-[20px] text-fg">Rack and pinion in 3D</h2>
          <p className="mt-1 text-[14px] text-fg-2">Watch two opposed racks turn the pinion, and see the flat torque line in the engineering view.</p>
          <ButtonLink href="/simulator?type=rack-pinion&mode=engineering" variant="primary" className="mt-4">
            <Box aria-hidden /> Open in engineering view
          </ButtonLink>
        </div>
      </section>
    </Page>
  );
}
