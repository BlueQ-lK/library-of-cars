"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { SimResult } from "@/lib/lapsim";

export default function TrackTelemetry({
  result,
  index,
  lapDistanceKm,
}: {
  result: SimResult;
  index: number;
  lapDistanceKm: number;
}) {
  const s = result.samples[Math.min(index, result.samples.length - 1)];

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(result.samples.length / 140));
    const out: { s: number; v: number }[] = [];
    for (let i = 0; i < result.samples.length; i += step) {
      out.push({
        s: +(result.samples[i].s / 1000).toFixed(2),
        v: Math.round(result.samples[i].speedKmh),
      });
    }
    return out;
  }, [result]);

  const curKm = +(s.s / 1000).toFixed(2);

  return (
    <div className="grid grid-cols-[1fr_0.6fr_0.6fr_1fr_2fr] gap-3">
      {/* Speed + gear */}
      <Card title="Speed">
        <div className="flex flex-col items-center">
          <Gauge value={s.speedKmh} max={400} />
          <div className="mt-2 flex w-full items-center justify-between rounded-lg border border-line px-2 py-1">
            <span className="grid h-6 w-6 place-items-center rounded bg-surface-2 text-sm font-bold">
              {s.gear}
            </span>
            <span className="tele-label">Gear</span>
          </div>
        </div>
      </Card>

      {/* Throttle */}
      <Card title="Throttle">
        <BarMeter pct={s.throttle * 100} color="var(--pos)" label={`${Math.round(s.throttle * 100)}%`} />
      </Card>

      {/* Brake */}
      <Card title="Brake">
        <BarMeter pct={s.brake * 100} color="var(--neg)" label={`${Math.round(s.brake * 100)}%`} />
      </Card>

      {/* G-force */}
      <Card title="G-Force">
        <GForce latG={s.latG} longG={s.longG} />
      </Card>

      {/* Speed vs distance */}
      <Card title="Speed vs Distance" right={`Lap ${lapDistanceKm.toFixed(2)} km`}>
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="s"
                type="number"
                domain={[0, Math.ceil(lapDistanceKm)]}
                tick={{ fontSize: 10, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                unit=""
              />
              <YAxis
                domain={[0, 400]}
                ticks={[0, 100, 200, 300, 400]}
                tick={{ fontSize: 10, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#vfill)"
                isAnimationActive={false}
                dot={false}
              />
              <ReferenceLine x={curKm} stroke="var(--foreground)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="tele-label">{title}</span>
        {right ? <span className="text-[10px] text-faint">{right}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Gauge({ value, max }: { value: number; max: number }) {
  const r = 42;
  const cx = 55;
  const cy = 52;
  // 220° arc opening at the bottom
  const startA = 160;
  const endA = -160;
  const frac = Math.max(0, Math.min(1, value / max));
  const polar = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arcPath = (a0: number, a1: number) => {
    const [x0, y0] = polar(a0);
    const [x1, y1] = polar(a1);
    const large = Math.abs(a0 - a1) > 180 ? 1 : 0;
    // sweep from a0 to a1 going clockwise (decreasing angle)
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const valA = startA + (endA - startA) * frac;
  return (
    <svg viewBox="0 0 110 78" className="w-full">
      <path d={arcPath(startA, endA)} fill="none" stroke="var(--surface-2)" strokeWidth={8} strokeLinecap="round" />
      <path d={arcPath(startA, valA)} fill="none" stroke="var(--accent)" strokeWidth={8} strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--foreground)">
        {Math.round(value)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="var(--faint)">
        km/h
      </text>
      <text x={14} y={74} fontSize={8} fill="var(--faint)">0</text>
      <text x={92} y={74} fontSize={8} fill="var(--faint)">{max}</text>
    </svg>
  );
}

function BarMeter({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-bold">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <div className="flex h-24 flex-col justify-between py-0.5 text-[9px] text-faint">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="relative h-24 w-4 overflow-hidden rounded-full bg-surface-2">
          <div
            className="absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-150"
            style={{ height: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function GForce({ latG, longG }: { latG: number; longG: number }) {
  const R = 46;
  const cx = 60;
  const cy = 58;
  const maxG = 1.5;
  const px = cx + (Math.max(-maxG, Math.min(maxG, latG)) / maxG) * R;
  const py = cy - (Math.max(-maxG, Math.min(maxG, longG)) / maxG) * R;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 118" className="w-full max-w-[140px]">
        {[R, (R * 2) / 3, R / 3].map((rr, i) => (
          <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke="var(--line)" strokeWidth={1} />
        ))}
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="var(--line)" strokeWidth={1} />
        <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="var(--line)" strokeWidth={1} />
        <text x={cx + R + 2} y={cy + 3} fontSize={8} fill="var(--faint)">1.5g</text>
        <text x={cx - R - 14} y={cy + 3} fontSize={8} fill="var(--faint)">-1.5g</text>
        <text x={cx + 3} y={cy - R + 2} fontSize={8} fill="var(--faint)">0g</text>
        <circle cx={px} cy={py} r={9} fill="var(--accent)" opacity={0.2} />
        <circle cx={px} cy={py} r={4.5} fill="var(--accent)" />
      </svg>
      <div className="mt-1 flex w-full flex-col gap-0.5 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Lateral: {latG.toFixed(2)}g
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neg" /> Longitudinal: {longG.toFixed(2)}g
        </span>
      </div>
    </div>
  );
}
