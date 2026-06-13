"use client";

import type { Car } from "@/lib/cars";
import { TRACKS, getTrack } from "@/lib/tracks";
import { useDashboard } from "@/lib/store";
import {
  ChevronDown,
  ChevronRight,
  Route,
  Spline,
  Cpu,
  Droplets,
  GitCompare,
  Info,
} from "lucide-react";

export default function TrackSidebar({ car }: { car: Car }) {
  const trimId = useDashboard((s) => s.trimId);
  const setTrim = useDashboard((s) => s.setTrim);
  const trackId = useDashboard((s) => s.trackId);
  const setTrack = useDashboard((s) => s.setTrack);
  const wet = useDashboard((s) => s.trackWet);
  const setWet = useDashboard((s) => s.setTrackWet);
  const compare = useDashboard((s) => s.trackCompare);
  const setCompare = useDashboard((s) => s.setTrackCompare);

  const track = getTrack(trackId);
  const grip = wet ? 0.78 : 1.0;

  const scenarios: { id: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "technical", label: "Technical", icon: Spline },
    { id: "street", label: "Street", icon: Route },
    { id: "power", label: "Power", icon: Cpu },
  ];

  return (
    <aside className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white">
      {/* Brand */}
      <div className="px-5 py-4">
        <button className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-surface">
          <span>{car.brand}</span>
          <ChevronDown size={16} className="text-faint" />
        </button>
      </div>

      <div className="flex-1 space-y-6 px-5 pb-6">
        {/* Trims */}
        <section>
          <h3 className="tele-label mb-2.5">Trims</h3>
          <div className="space-y-2">
            {car.trims.map((trim) => {
              const active = trim.id === trimId;
              return (
                <button
                  key={trim.id}
                  onClick={() => setTrim(trim.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                    active ? "border-accent bg-accent-soft/40" : "border-line hover:bg-surface"
                  }`}
                >
                  <div className="grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                    <svg width="34" height="18" viewBox="0 0 64 32" fill="none" className="text-faint">
                      <path
                        d="M4 22c0-2 2-3 4-3h2l4-7c1-2 3-3 5-3h18c3 0 5 1 7 3l4 5 8 2c2 1 3 2 3 4v2H4v-3z"
                        fill="currentColor"
                        opacity="0.45"
                      />
                      <circle cx="18" cy="25" r="4" fill="currentColor" />
                      <circle cx="46" cy="25" r="4" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium leading-tight">{trim.name}</div>
                    <div className="tele-readout text-[12px] text-accent">{trim.price}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Track selection */}
        <section>
          <h3 className="tele-label mb-2.5">Track Selection</h3>
          <div className="space-y-2">
            {TRACKS.map((t) => {
              const active = t.id === trackId;
              return (
                <button
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                    active ? "border-accent bg-accent-soft/40" : "border-line hover:bg-surface"
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-foreground">
                    <Route size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-tight">{t.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {(t.lengthM / 1000).toFixed(2)} km · {t.corners} Corners
                    </span>
                  </span>
                  {active && <ChevronRight size={15} className="shrink-0 text-faint" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Scenario */}
        <section>
          <h3 className="tele-label mb-2.5">Scenario</h3>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((sc) => {
              const Icon = sc.icon;
              const active = trackId === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setTrack(sc.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? "border-accent bg-accent-soft/50 text-accent" : "border-line hover:bg-surface"
                  }`}
                >
                  <Icon size={14} />
                  {sc.label}
                </button>
              );
            })}
            <button
              onClick={() => setWet(!wet)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                wet ? "border-accent bg-accent-soft/50 text-accent" : "border-line hover:bg-surface"
              }`}
            >
              <Droplets size={14} />
              Wet
            </button>
            <button
              onClick={() => setCompare(!compare)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                compare ? "border-accent bg-accent-soft/50 text-accent" : "border-line hover:bg-surface"
              }`}
            >
              <GitCompare size={14} />
              Compare
            </button>
          </div>
        </section>

        {/* Grip info */}
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-accent" />
            <span className="text-xs font-medium">
              Track grip: {grip.toFixed(2)} ({wet ? "Wet" : "Dry"})
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {wet ? "Reduced grip from standing water" : "Base asphalt conditions"}
          </p>
        </div>
      </div>
    </aside>
  );
}
