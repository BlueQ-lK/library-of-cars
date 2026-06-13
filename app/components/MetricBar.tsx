"use client";

import type { Car } from "@/lib/cars";
import {
  Zap,
  Gauge,
  Timer,
  TrendingUp,
  Fuel,
  Leaf,
  type LucideIcon,
} from "lucide-react";

const METRIC_ICONS: Record<string, LucideIcon> = {
  Power: Zap,
  Torque: Gauge,
  "0 – 100 km/h": Timer,
  "Top Speed": TrendingUp,
  "Fuel Economy": Fuel,
  "CO₂ Emissions": Leaf,
};

export default function MetricBar({ car }: { car: Car }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-6">
      {car.metrics.map((m) => {
        const Icon = METRIC_ICONS[m.label] ?? Zap;
        return (
          <div key={m.label} className="bg-white px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon size={14} strokeWidth={1.75} className="text-accent" />
              <span className="text-[11px] font-medium">{m.label}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="tele-readout text-xl font-bold leading-none">
                {m.value}
              </span>
              {m.unit && (
                <span className="text-[11px] text-muted-foreground">
                  {m.unit}
                </span>
              )}
            </div>
            {m.note && (
              <div className="mt-1 text-[10px] text-faint">{m.note}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
