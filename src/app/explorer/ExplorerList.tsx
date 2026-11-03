"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { FAMILIES, type PowerSource, type Technology } from "@/data/actuators";
import { Segmented } from "@/components/ui/controls";
import { Tag } from "@/components/ui/primitives";

type Status = "all" | "interactive" | "planned";

export function ExplorerList() {
  const [query, setQuery] = useState("");
  const [tech, setTech] = useState<"all" | Technology>("all");
  const [power, setPower] = useState<"all" | PowerSource>("all");
  const [status, setStatus] = useState<Status>("all");

  const techs = Array.from(new Set(FAMILIES.map((f) => f.technology)));
  const powers = Array.from(new Set(FAMILIES.map((f) => f.powerSource)));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAMILIES.filter(
      (f) =>
        (tech === "all" || f.technology === tech) &&
        (power === "all" || f.powerSource === power) &&
        (status === "all" || f.status === status) &&
        (!q || [f.code, f.name, f.technology, f.powerSource, f.summary].join(" ").toLowerCase().includes(q)),
    );
  }, [query, tech, power, status]);

  const clear = () => {
    setQuery("");
    setTech("all");
    setPower("all");
    setStatus("all");
  };
  const filtered = query || tech !== "all" || power !== "all" || status !== "all";

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-72">
          <span className="sr-only">Search actuator families</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, technology or power"
            className="h-9 w-full rounded-xl bg-panel pl-9 pr-3 text-[14px] text-fg placeholder:text-muted focus:border-rule-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Technology"
            value={tech}
            onChange={(e) => setTech(e.target.value as typeof tech)}
            className="h-9 rounded-xl bg-panel px-2.5 text-[13.5px] text-fg"
          >
            <option value="all">All technologies</option>
            {techs.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            aria-label="Power source"
            value={power}
            onChange={(e) => setPower(e.target.value as typeof power)}
            className="h-9 rounded-xl bg-panel px-2.5 text-[13.5px] text-fg"
          >
            <option value="all">All power sources</option>
            {powers.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <Segmented
            size="sm"
            label="Simulation status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "interactive", label: "Interactive" },
              { value: "planned", label: "Planned" },
            ]}
          />
          {filtered && (
            <button type="button" onClick={clear} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-muted hover:text-fg">
              <X className="size-3.5" aria-hidden /> Clear
            </button>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {results.length} families shown
      </p>

      {results.length === 0 ? (
        <div className="rounded-2xl bg-panel p-8 text-center">
          <p className="font-medium text-fg">No families match these filters.</p>
          <button type="button" onClick={clear} className="mt-2 text-[14px] text-accent underline underline-offset-2">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-panel">
          <div className="hidden grid-cols-[120px_1.4fr_1fr_1fr_1fr_120px] gap-4 border-b border-rule px-4 py-2.5 text-[12.5px] text-muted md:grid">
            <span>Code</span>
            <span>Family</span>
            <span>Technology</span>
            <span>Power source</span>
            <span>Movement</span>
            <span className="text-right">Simulation</span>
          </div>
          <ul className="divide-y divide-rule">
            {results.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/explorer/${f.id}`}
                  className="grid gap-1 px-4 py-3.5 transition-colors hover:bg-panel-2 md:grid-cols-[120px_1.4fr_1fr_1fr_1fr_120px] md:items-center md:gap-4"
                >
                  <span className="font-display text-[22px] font-semibold leading-none text-fg">{f.code}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-fg">{f.name}</span>
                    <span className="block truncate text-[13px] text-muted">{f.summary}</span>
                  </span>
                  <span className="text-[13.5px] text-fg-2">{f.technology}</span>
                  <span className="text-[13.5px] text-fg-2">{f.powerSource}</span>
                  <span className="text-[13.5px] text-fg-2">{f.movement}</span>
                  <span className="md:text-right">{f.status === "interactive" ? <Tag tone="live">Interactive</Tag> : <Tag>Coming soon</Tag>}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-muted">
        Family codes are listed as scoped for this programme. Product data is not shown until verified against official Rotork documentation.
      </p>
    </div>
  );
}
