/**
 * A single number set at presentation-slide scale, with its meaning beside it.
 * Only used where the number is real and is the point of the section.
 */
export function KeyFigure({ value, label }: { value: string; label: string }) {
  return (
    <figure className="my-10 grid items-end gap-4 border-y border-rule py-8 sm:grid-cols-[auto_1fr] sm:gap-10">
      <div className="num font-display text-[clamp(64px,11vw,148px)] font-semibold leading-[0.82] tracking-[-0.055em] text-fg">{value}</div>
      <figcaption className="max-w-[34ch] pb-1 text-[17px] leading-[1.4] text-fg-2">{label}</figcaption>
    </figure>
  );
}
