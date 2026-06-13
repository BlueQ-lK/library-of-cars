"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCars } from "@/lib/carRegistry";
import { useDashboard } from "@/lib/store";
import { F1_CAR, F1_CAR_ID, resolveF1Setup } from "@/lib/f1";
import CarStage from "../viewer/CarStage";
import { ChevronLeft, Gauge, Wind, Zap, Disc, Scale, Settings2 } from "lucide-react";

export default function GaragePanel() {
  const f1Setup = useDashboard((s) => s.f1Setup);

  // Register the F1 chassis and select it so the shared 3D viewer shows it.
  useEffect(() => {
    useCars.getState().addCar(F1_CAR);
    useDashboard.getState().setCarId(F1_CAR_ID);
  }, []);

  const spec = resolveF1Setup(F1_CAR, f1Setup);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface"
          >
            <ChevronLeft size={16} />
            Exit Garage
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">F1 Garage</h1>
              <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                Beta
              </span>
            </div>
            <div className="text-[11px] text-faint">{F1_CAR.fullName} · Setup Bench</div>
          </div>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-[11px] text-faint">
          Phase 1 · data model
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 3D chassis */}
        <section
          className="relative min-w-0 flex-1"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 35%, #ffffff 0%, #f7f8fa 55%, #eef0f3 100%)",
          }}
        >
          <div className="absolute inset-0">
            <CarStage />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-white/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            Tuning is data-only — the chassis never changes visually
          </div>
        </section>

        {/* Engineering overview (read-only in Phase 1) */}
        <aside className="flex w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-white px-5 py-5">
          <div>
            <h2 className="tele-label mb-1">Engineering Overview</h2>
            <p className="text-[11px] text-muted-foreground">
              Live consequences of the current setup. Lap time is intentionally
              not shown here — run the Simulation to discover what the setup does
              on track.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Spec icon={Wind} label="Drag Cd" value={spec.cd.toFixed(3)} />
            <Spec icon={Wind} label="Downforce" value={`${spec.downforceN.toLocaleString()} N`} sub="@ 250 km/h" />
            <Spec icon={Zap} label="Power" value={`${spec.powerHp} hp`} sub={`${spec.powerKw} kW`} />
            <Spec icon={Scale} label="Weight" value={`${spec.massKg} kg`} />
            <Spec icon={Gauge} label="Top Speed" value={`${spec.topSpeedKmh} km/h`} sub="drag-limited" />
            <Spec icon={Disc} label="Tyre Grip μ" value={spec.grip.toFixed(2)} />
            <Spec icon={Settings2} label="Front Balance" value={`${spec.frontBalancePct}%`} sub="front" />
            <Spec icon={Wind} label="Brake Cooling" value={`${spec.brakeCoolingPct}%`} />
          </div>

          {/* downforce composite bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Composite Downforce</span>
              <span className="tele-readout font-semibold">{Math.round(spec.downforce * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${spec.downforce * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
            Current setup — FW {f1Setup.frontWing} · RW {f1Setup.rearWing} ·{" "}
            {f1Setup.rideHeight} ride · {f1Setup.engineMode} · {f1Setup.tyre} tyres ·
            ducts {f1Setup.brakeDuct}. Interactive tuning controls arrive in Phase 2.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-line px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-faint">
        <Icon size={12} />
        {label}
      </div>
      <div className="tele-readout text-sm font-semibold">{value}</div>
      {sub ? <div className="text-[10px] text-faint">{sub}</div> : null}
    </div>
  );
}
