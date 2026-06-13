"use client";

import type { Car } from "@/lib/cars";
import { useDashboard } from "@/lib/store";
import {
  Cog,
  Gauge,
  Zap,
  Timer,
  TrendingUp,
  Compass,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  CircleDot,
  Disc,
  Package,
  Armchair,
  type LucideIcon,
} from "lucide-react";

const PERF_ICONS: Record<string, LucideIcon> = {
  Engine: Cog,
  Horsepower: Zap,
  Torque: Gauge,
  "0 – 100 km/h": Timer,
  "Top Speed": TrendingUp,
  Drivetrain: Compass,
};

const CONFIG_ICONS: Record<string, LucideIcon> = {
  Wheels: CircleDot,
  Brakes: Disc,
  Packages: Package,
  Interior: Armchair,
};

export default function RightSidebar({ car }: { car: Car }) {
  const rightOpen = useDashboard((s) => s.rightOpen);
  const toggleRight = useDashboard((s) => s.toggleRight);

  return (
    <div
      className={`relative h-full shrink-0 transition-[width] duration-300 ease-in-out ${
        rightOpen ? "w-[300px]" : "w-0"
      }`}
    >
      {/* Collapse / expand handle (kept outside the clipped region) */}
      <button
        onClick={toggleRight}
        aria-label={rightOpen ? "Collapse panel" : "Expand panel"}
        className="absolute -left-3 top-20 z-20 grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-muted-foreground shadow-sm transition-colors hover:bg-surface hover:text-foreground"
      >
        {rightOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="h-full w-[300px] overflow-hidden">
        <aside className="flex h-full w-[300px] flex-col overflow-y-auto border-l border-line bg-white px-5 py-5">
      {/* Performance */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Performance</h3>
        <ul className="space-y-2.5">
          {car.performance.map((p) => {
            const Icon = PERF_ICONS[p.label] ?? Cog;
            return (
              <li key={p.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Icon size={15} strokeWidth={1.75} className="text-faint" />
                  {p.label}
                </span>
                <span className="tele-readout text-xs font-medium">
                  {p.value}
                </span>
              </li>
            );
          })}
        </ul>
        <button className="mt-4 w-full rounded-lg border border-line py-2 text-xs font-medium transition-colors hover:bg-surface">
          See Full Specifications
        </button>
      </section>

      <Divider />

      {/* Key Features */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Key Features</h3>
        <ul className="space-y-2.5">
          {car.keyFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <CheckCircle2
                size={15}
                strokeWidth={1.75}
                className="shrink-0 text-pos"
              />
              <span className="text-xs text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <Divider />

      {/* Configure */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">
          Configure Your {car.name}
        </h3>
        <div className="space-y-2">
          {car.configure.map((c) => {
            const Icon = CONFIG_ICONS[c.label] ?? CircleDot;
            return (
              <button
                key={c.label}
                className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition-colors hover:bg-surface"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-foreground">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-tight">
                    {c.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {c.value}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </button>
            );
          })}
        </div>
      </section>
        </aside>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-line" />;
}
