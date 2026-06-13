"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useCars } from "@/lib/carRegistry";
import { useDashboard } from "@/lib/store";
import {
  F1_CAR,
  F1_CAR_ID,
  DEFAULT_F1_SETUP,
  resolveF1Setup,
} from "@/lib/f1";
import CarStage from "../viewer/CarStage";
import SetupPanel from "./SetupPanel";
import {
  ChevronLeft,
  Gauge,
  Wind,
  Zap,
  Disc,
  Scale,
  Settings2,
  Play,
} from "lucide-react";

export default function GaragePanel() {
  const f1Setup = useDashboard((s) => s.f1Setup);
  const router = useRouter();

  // Register the F1 chassis and select it so the shared 3D viewer shows it.
  useEffect(() => {
    useCars.getState().addCar(F1_CAR);
    useDashboard.getState().setCarId(F1_CAR_ID);
  }, []);

  const goAero = () => {
    useDashboard.setState({ aeroMode: true, labMode: false });
    router.push("/");
  };
  const goSim = () => {
    useDashboard.setState({ labMode: true, aeroMode: false });
    router.push("/");
  };

  const spec = resolveF1Setup(F1_CAR, f1Setup);
  const base = resolveF1Setup(F1_CAR, DEFAULT_F1_SETUP);

  return (
    <motion.div
      className="flex h-[100dvh] flex-col overflow-hidden bg-white"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
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
            <div className="text-[11px] text-faint">
              {F1_CAR.fullName} · Setup Bench
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goAero}
            className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
          >
            <Wind size={16} />
            Aerodynamics
          </button>
          <button
            onClick={goSim}
            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Play size={16} />
            Run Simulation
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Setup controls */}
        <SetupPanel />

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

        {/* Engineering overview (reacts to setup) */}
        <aside className="flex w-[330px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-white px-5 py-5">
          <div>
            <h2 className="tele-label mb-1">Engineering Overview</h2>
            <p className="text-[11px] text-muted-foreground">
              Live consequences of your setup (vs. the default). Lap time is
              intentionally not shown — run the Simulation to see what the setup
              does on track.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Spec
              icon={Wind}
              label="Drag Cd"
              value={spec.cd.toFixed(3)}
              delta={fmt(spec.cd - base.cd, 3)}
            />
            <Spec
              icon={Wind}
              label="Downforce"
              value={`${spec.downforceN.toLocaleString()} N`}
              sub="@ 250 km/h"
              delta={fmt(spec.downforceN - base.downforceN, 0, " N")}
            />
            <Spec
              icon={Zap}
              label="Power"
              value={`${spec.powerHp} hp`}
              sub={`${spec.powerKw} kW`}
              delta={fmt(spec.powerHp - base.powerHp, 0, " hp")}
            />
            <Spec icon={Scale} label="Weight" value={`${spec.massKg} kg`} />
            <Spec
              icon={Gauge}
              label="Top Speed"
              value={`${spec.topSpeedKmh} km/h`}
              sub="drag-limited"
              delta={fmt(spec.topSpeedKmh - base.topSpeedKmh, 0, " km/h")}
            />
            <Spec
              icon={Disc}
              label="Tyre Grip μ"
              value={spec.grip.toFixed(2)}
              delta={fmt(spec.grip - base.grip, 2)}
            />
            <Spec
              icon={Settings2}
              label="Front Balance"
              value={`${spec.frontBalancePct}%`}
              sub="front"
            />
            <Spec
              icon={Wind}
              label="Brake Cooling"
              value={`${spec.brakeCoolingPct}%`}
            />
          </div>

          {/* downforce composite bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Composite Downforce</span>
              <span className="tele-readout font-semibold">
                {Math.round(spec.downforce * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${spec.downforce * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              More downforce improves cornering but raises drag and lowers top
              speed — the core setup tradeoff.
            </p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

/** Format a signed delta, omitting it when ~zero. */
function fmt(d: number, decimals: number, unit = ""): string | undefined {
  if (Math.abs(d) < (decimals === 0 ? 0.5 : Math.pow(10, -decimals) / 2))
    return undefined;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(decimals)}${unit}`;
}

function Spec({
  icon: Icon,
  label,
  value,
  sub,
  delta,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
  delta?: string;
}) {
  return (
    <div className="rounded-lg border border-line px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-faint">
        <Icon size={12} />
        {label}
      </div>
      <div className="tele-readout text-sm font-semibold">{value}</div>
      {delta ? (
        <div className="tele-readout text-[10px] font-medium text-accent">
          {delta}
        </div>
      ) : sub ? (
        <div className="text-[10px] text-faint">{sub}</div>
      ) : null}
    </div>
  );
}
