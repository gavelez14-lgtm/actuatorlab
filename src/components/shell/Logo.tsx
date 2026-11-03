/** ActuatorLab mark: a slotted yoke arm swung on its pivot, with the pin. Original artwork. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="0" y="0" width="32" height="32" rx="7.5" fill="var(--fg)" />
      <g transform="rotate(-30 11 22)">
        <rect x="7" y="4" width="8" height="22" rx="4" fill="none" stroke="var(--bg)" strokeWidth="2.2" />
        <circle cx="11" cy="22" r="1.6" fill="var(--bg)" />
      </g>
      <line x1="4" y1="9.5" x2="28" y2="9.5" stroke="var(--bg)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="9.2" cy="9.5" r="2.6" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-fg">ActuatorLab</span>
  );
}
