"use client";

import type { Car } from "@/lib/cars";
import { useDashboard } from "@/lib/store";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ruler,
  MoveHorizontal,
  MoveVertical,
  GitCommitHorizontal,
  Weight,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

const DIMENSION_ICONS: Record<string, LucideIcon> = {
  Length: Ruler,
  Width: MoveHorizontal,
  Height: MoveVertical,
  Wheelbase: GitCommitHorizontal,
  "Curb Weight": Weight,
  "Trunk Space": Briefcase,
};

export default function LeftSidebar({ car }: { car: Car }) {
  const trimId = useDashboard((s) => s.trimId);
  const setTrim = useDashboard((s) => s.setTrim);
  const interiorId = useDashboard((s) => s.interiorId);
  const setInterior = useDashboard((s) => s.setInterior);
  const leftOpen = useDashboard((s) => s.leftOpen);
  const toggleLeft = useDashboard((s) => s.toggleLeft);

  const activeInterior =
    car.interiorColors.find((c) => c.id === interiorId) ??
    car.interiorColors[0];

  return (
    <div
      className={`relative h-full shrink-0 transition-[width] duration-300 ease-in-out ${
        leftOpen ? "w-[260px]" : "w-0"
      }`}
    >
      {/* Collapse / expand handle (kept outside the clipped region) */}
      <button
        onClick={toggleLeft}
        aria-label={leftOpen ? "Collapse panel" : "Expand panel"}
        className="absolute -right-3 top-20 z-20 grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-muted-foreground shadow-sm transition-colors hover:bg-surface hover:text-foreground"
      >
        {leftOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className="h-full w-[260px] overflow-hidden">
        <aside className="flex h-full w-[260px] flex-col overflow-y-auto border-r border-line bg-white">
      {/* Brand selector */}
      <div className="px-5 py-4">
        <button className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-surface">
          <span>{car.brand}</span>
          <ChevronDown size={16} className="text-faint" />
        </button>
      </div>

      <div className="flex-1 space-y-6 px-5 pb-6">
        {/* Trims */}
        <section>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Trims
          </h3>
          <div className="space-y-2">
            {car.trims.map((trim) => {
              const isActive = trim.id === trimId;
              return (
                <button
                  key={trim.id}
                  onClick={() => setTrim(trim.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                    isActive
                      ? "border-accent bg-accent-soft/40"
                      : "border-line hover:bg-surface"
                  }`}
                >
                  {/* thumbnail placeholder */}
                  <div className="grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                    <CarSilhouette />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium leading-tight">
                      {trim.name}
                    </div>
                    <div className="tele-readout text-[12px] text-accent">
                      {trim.price}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interior Color */}
        <section>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Interior Color
          </h3>
          <div className="flex items-center gap-2.5">
            {car.interiorColors.map((c) => {
              const selected = c.id === interiorId;
              return (
                <button
                  key={c.id}
                  title={c.name}
                  onClick={() => setInterior(c.id)}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    selected
                      ? "ring-2 ring-accent ring-offset-2"
                      : "hover:scale-105"
                  }`}
                  style={{
                    background: c.hex,
                    boxShadow: !selected
                      ? "inset 0 0 0 1px rgba(0,0,0,0.12)"
                      : undefined,
                  }}
                >
                  <span className="sr-only">{c.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full"
              style={{
                background: activeInterior.hex,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
              }}
            />
            <span className="text-xs text-muted-foreground">
              {car.interiorColorLabel}
            </span>
          </div>
        </section>

        {/* Dimensions */}
        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dimensions
          </h3>
          <ul className="space-y-3">
            {car.dimensions.map((d) => {
              const Icon = DIMENSION_ICONS[d.label] ?? Ruler;
              return (
                <li key={d.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Icon size={15} strokeWidth={1.75} className="text-faint" />
                    {d.label}
                  </span>
                  <span className="tele-readout text-xs font-medium">
                    {d.value}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
        </aside>
      </div>
    </div>
  );
}

function CarSilhouette() {
  return (
    <svg
      width="34"
      height="18"
      viewBox="0 0 64 32"
      fill="none"
      className="text-faint"
    >
      <path
        d="M4 22c0-2 2-3 4-3h2l4-7c1-2 3-3 5-3h18c3 0 5 1 7 3l4 5 8 2c2 1 3 2 3 4v2H4v-3z"
        fill="currentColor"
        opacity="0.45"
      />
      <circle cx="18" cy="25" r="4" fill="currentColor" />
      <circle cx="46" cy="25" r="4" fill="currentColor" />
    </svg>
  );
}
