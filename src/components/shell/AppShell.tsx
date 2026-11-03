"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav";
import { LogoMark, Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <nav aria-label="Primary" className="space-y-5">
      {groups.map((g) => (
        <div key={g}>
          <h2 className="mb-1 px-2.5 font-sans text-[11px] font-semibold tracking-normal text-muted">{g}</h2>
          <ul className="flex flex-col gap-px">
            {NAV.filter((n) => n.group === g).map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                      active ? "bg-fill-2 font-medium text-fg" : "text-fg-2 hover:bg-fill",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-muted")} strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto space-y-2 pt-4">
      <ThemeToggle />
      <p className="px-2.5 text-[11.5px] leading-snug text-muted">
        Independent educational project. Not affiliated with or endorsed by Rotork. Models are simplified and illustrative.{" "}
        <Link href="/about" className="underline decoration-rule-strong underline-offset-2 hover:text-fg">
          About and sources
        </Link>
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 hidden h-dvh flex-col border-r border-rule px-3 py-5 lg:flex">
        <Link href="/" className="mb-7 flex items-center gap-2 px-2" aria-label="ActuatorLab home">
          <LogoMark className="size-7" />
          <Wordmark />
        </Link>
        <NavList />
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-40 flex h-12 items-center justify-between border-b border-rule px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2" aria-label="ActuatorLab home">
          <LogoMark className="size-7" />
          <Wordmark />
        </Link>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full text-fg hover:bg-fill"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-panel px-3 py-5 shadow-2xl">
              <div className="mb-6 flex items-center justify-between px-2">
                <Dialog.Title asChild>
                  <span className="flex items-center gap-2">
                    <LogoMark className="size-7" />
                    <Wordmark />
                  </span>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:text-fg" aria-label="Close navigation">
                    <X className="size-5" aria-hidden />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">Main sections of ActuatorLab</Dialog.Description>
              <NavList onNavigate={() => setOpen(false)} />
              <SidebarFooter />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <main id="main" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
