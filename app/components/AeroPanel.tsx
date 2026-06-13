"use client";

import dynamic from "next/dynamic";
import type { Car, AeroViewId } from "@/lib/cars";
import { useDashboard } from "@/lib/store";
import {
  Wind,
  Layers,
  Thermometer,
  Tornado,
  LayoutGrid,
  Gauge,
  X,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";

const AeroScene = dynamic(() => import("./viewer/AeroScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <span className="tele-label">Initializing airflow</span>
      </div>
    </div>
  ),
});

const VIEW_ICONS: Record<AeroViewId, LucideIcon> = {
  all: LayoutGrid,
  external: Wind,
  underbody: Layers,
  cooling: Thermometer,
  wake: Tornado,
};

export default function AeroPanel({ car }: { car: Car }) {
  const aero = car.aero;
  const view = useDashboard((s) => s.aeroView);
  const setView = useDashboard((s) => s.setAeroView);
  const scenarioId = useDashboard((s) => s.aeroScenario);
  const setScenario = useDashboard((s) => s.setAeroScenario);
  const selectedId = useDashboard((s) => s.aeroComponent);
  const setComponent = useDashboard((s) => s.setAeroComponent);
  const toggleAeroMode = useDashboard((s) => s.toggleAeroMode);

  const scenario =
    aero.scenarios.find((s) => s.id === scenarioId) ?? aero.scenarios[0];
  const activeView = aero.views.find((v) => v.id === view) ?? aero.views[0];
  const selected = aero.components.find((c) => c.id === selectedId);
  const m = scenario.metrics;

  // Physics: aerodynamic drag from the standard drag equation.
  // Fd = ½·ρ·Cd·A·v²  (ρ = air density, v = speed in m/s).
  const derivedArea = useDashboard((s) => s.derivedFrontalArea);
  const frontalArea = derivedArea ?? aero.frontalAreaM2;
  const RHO = 1.225; // kg/m³ at sea level, 15 °C
  const vms = scenario.speedKmh / 3.6; // km/h → m/s
  const dragForce = 0.5 * RHO * m.cd * frontalArea * vms * vms; // N
  const dragPowerKw = (dragForce * vms) / 1000; // P = F·v → kW to overcome drag

  return (
    <div className="absolute inset-0 bg-white">
      {/* 3D side-view scene with animated airflow */}
      <div className="absolute inset-0">
        <AeroScene view={view} scenario={scenario} />
      </div>

      {/* ---- Top bar ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        {/* Exit */}
        <button
          onClick={toggleAeroMode}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-surface"
        >
          <ChevronLeft size={14} />
          Exit Aerodynamics
        </button>

        {/* View segmented control */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-white/90 p-1 shadow-sm backdrop-blur">
          {aero.views.map((v) => {
            const Icon = VIEW_ICONS[v.id];
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">
                  {v.name.replace(" Airflow", "").replace(" Turbulence", "")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Speed pill */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur">
          <Gauge size={14} className="text-accent" />
          <span className="tele-readout text-sm font-semibold">
            {scenario.speedKmh}
          </span>
          <span className="text-[11px] text-faint">km/h</span>
        </div>
      </div>

      {/* ---- Right info panel ---- */}
      <div className="absolute right-4 top-16 z-10 flex max-h-[calc(100%-9rem)] w-[300px] flex-col overflow-hidden rounded-2xl border border-line bg-white/92 shadow-lg backdrop-blur">
        {selected ? (
          <div className="flex flex-col overflow-y-auto p-4">
            <button
              onClick={() => setComponent(null)}
              className="mb-2 flex items-center gap-1 self-start text-xs font-medium text-accent"
            >
              <ChevronLeft size={13} /> Back
            </button>
            <h3 className="text-sm font-semibold">{selected.name}</h3>
            <Field title="Purpose" body={selected.purpose} />
            <Field title="Design" body={selected.design} />
            <Field title="Performance Impact" body={selected.impact} />
          </div>
        ) : (
          <div className="flex flex-col overflow-y-auto p-4">
            {/* View header */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold">{activeView.name}</h3>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {activeView.blurb}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Drag Cd" value={m.cd.toFixed(2)} />
              <Stat
                label={derivedArea ? "Frontal Area ✓" : "Frontal Area"}
                value={`${frontalArea.toFixed(2)}`}
                unit="m²"
              />
              <Stat
                label="Drag Force"
                value={Math.round(dragForce).toLocaleString()}
                unit="N"
              />
              <Stat
                label="Power vs Drag"
                value={dragPowerKw.toFixed(1)}
                unit="kW"
              />
              <Stat
                label={m.downforceN >= 0 ? "Downforce" : "Lift"}
                value={`${Math.abs(m.downforceN)}`}
                unit="N"
                tone={m.downforceN >= 0 ? "pos" : "neg"}
              />
              <Stat
                label="Front Balance"
                value={`${m.frontLiftPct}`}
                unit="% f"
              />
            </div>

            <p className="mt-2 rounded-lg bg-surface px-2.5 py-2 text-[10px] leading-relaxed text-faint">
              Drag computed live: Fd = ½·ρ·Cd·A·v² with ρ = 1.225 kg/m³, v ={" "}
              {vms.toFixed(1)} m/s.
              {derivedArea
                ? " Frontal area A is measured from the 3D model; Cd is authored."
                : ""}
            </p>

            <div className="mt-3 space-y-2.5">
              <Bar label="Cooling Flow" pct={m.coolingFlow} />
              <Bar label="Aero Efficiency" pct={m.efficiency} />
              <Bar label="Stability" pct={m.stability} />
            </div>

            <p className="mt-3 rounded-lg bg-surface p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              {scenario.description}
            </p>

            {/* Components */}
            <div className="mt-3">
              <span className="tele-label">Components</span>
              <div className="mt-1.5 flex flex-col gap-1">
                {aero.components.map((c) => {
                  const relevant = view === "all" || c.views.includes(view);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setComponent(c.id)}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-surface ${
                        relevant
                          ? "border-line font-medium text-foreground"
                          : "border-line/60 text-muted-foreground"
                      }`}
                    >
                      <span>{c.name}</span>
                      {relevant && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Scenario selector (bottom, raised above controls bar) ---- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-line bg-white/92 p-1 shadow-lg backdrop-blur">
          {aero.scenarios.map((s) => {
            const isActive = scenarioId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`flex flex-col items-center rounded-xl px-3 py-1.5 transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface"
                }`}
              >
                <span className="text-xs font-medium">{s.name}</span>
                <span
                  className={`tele-readout text-[10px] ${
                    isActive ? "text-accent-foreground/80" : "text-faint"
                  }`}
                >
                  {s.speedKmh} km/h
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-2.5 py-2">
      <div className="text-[10px] text-faint">{label}</div>
      <div
        className={`tele-readout text-sm font-semibold ${
          tone === "pos"
            ? "text-pos"
            : tone === "neg"
              ? "text-neg"
              : "text-foreground"
        }`}
      >
        {value}
        {unit ? (
          <span className="ml-0.5 text-[10px] font-normal text-faint">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="tele-readout text-[11px] font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function Field({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3">
      <span className="tele-label">{title}</span>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
