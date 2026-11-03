import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Buttons: capsule shapes, filled or tinted, never outlined (Apple HIG). */

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-hover",
        secondary: "bg-fill text-fg hover:bg-fill-2",
        ghost: "text-fg-2 hover:bg-fill hover:text-fg",
        outline: "bg-fill text-fg hover:bg-fill-2",
        link: "px-0 text-accent hover:underline underline-offset-4",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-9 px-4 text-[14px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-9 text-[14px]",
        "icon-sm": "size-8 text-[13px]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/** Apple-style text link with a trailing chevron, e.g. "Start learning ›". */
export function ChevronLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-0.5 text-accent hover:underline underline-offset-4", className)}>
      {children}
      <svg viewBox="0 0 8 14" className="ml-0.5 h-[0.7em] w-auto transition-transform group-hover:translate-x-0.5" aria-hidden>
        <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/* Status tags: quiet, rounded, tinted. */

const tagVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12px] font-medium leading-none", {
  variants: {
    tone: {
      neutral: "bg-fill text-muted",
      live: "bg-accent-soft text-accent",
      air: "bg-air-soft text-air",
      ok: "bg-ok/15 text-ok",
      warn: "bg-warn/15 text-warn",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Tag({ className, tone, children }: { className?: string; children: ReactNode } & VariantProps<typeof tagVariants>) {
  return <span className={cn(tagVariants({ tone }), className)}>{children}</span>;
}

/* Layout ------------------------------------------------------------------ */

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-14", className)}>{children}</div>;
}

export function PageHeader({ title, lead, actions, children }: { title: string; lead?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {children}
        <h1 className="text-[36px] text-fg sm:text-[48px]">{title}</h1>
        {lead && <p className="mt-3 max-w-[60ch] text-[17px] leading-[1.47] text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "aside" }) {
  return <As className={cn("rounded-2xl bg-panel", className)}>{children}</As>;
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-[24px] text-fg">
        {children}
      </h2>
      {action}
    </div>
  );
}

/**
 * Marks illustrative or unverified content, Apple-footnote style:
 * plain secondary text, no badge chrome.
 */
export function Illustrative({ children = "Illustrative values" }: { children?: ReactNode }) {
  return <span className="text-[12px] font-normal text-muted">{children}</span>;
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-fill-2", className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${v * 100}%` }} />
    </div>
  );
}
