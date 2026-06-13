"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { Track } from "@/lib/tracks";
import type { SimResult } from "@/lib/lapsim";
import { formatLapTime, speedColor } from "@/lib/lapsim";
import type { Best } from "./TrackResults";
import { X } from "lucide-react";

export default function DetailedReport({
  track,
  result,
  best,
  carName,
  onClose,
}: {
  track: Track;
  result: SimResult;
  best: Best;
  carName: string;
  onClose: () => void;
}) {
  // Per-corner minimum speed (slowest point near each corner marker).
  const cornerSpeeds = useMemo(() => {
    const win = track.lengthM * 0.03;
    return result.corners.map((c) => {
      let min = Infinity;
      for (const s of result.samples) {
        if (Math.abs(s.s - c.s) <= win && s.speedKmh < min) min = s.speedKmh;
      }
      return { number: c.number, speed: isFinite(min) ? min : 0 };
    });
  }, [result, track]);

  const maxCornerSpeed = Math.max(120, ...cornerSpeeds.map((c) => c.speed));

  // G-G traction circle bounds.
  const ggMax = Math.max(
    1.5,
    ...result.samples.map((s) => Math.max(Math.abs(s.latG), Math.abs(s.longG))),
  );

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
        initial={{ scale: 0.95, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Detailed Telemetry Report</h2>
            <p className="text-[11px] text-faint">
              {carName} · {track.name} · {formatLapTime(result.lapTimeS)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted-foreground transition-colors hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 overflow-y-auto p-6 md:grid-cols-2">
          {/* Per-corner min speeds */}
          <section className="md:col-span-2">
            <h3 className="tele-label mb-3">Minimum Speed per Corner</h3>
            <div className="space-y-2">
              {cornerSpeeds.map((c) => (
                <div key={c.number} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                    {c.number}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.speed / maxCornerSpeed) * 100}%`,
                        background: speedColor(c.speed),
                      }}
                    />
                  </div>
                  <span className="tele-readout w-20 shrink-0 text-right text-sm font-semibold">
                    {Math.round(c.speed)}
                    <span className="ml-0.5 text-[10px] font-normal text-faint">km/h</span>
                  </span>
                </div>
              ))}
              {cornerSpeeds.length === 0 && (
                <p className="text-xs text-muted-foreground">No tight corners detected on this layout.</p>
              )}
            </div>
          </section>

          {/* G-G traction circle */}
          <section>
            <h3 className="tele-label mb-3">G-G Traction Circle</h3>
            <GGPlot result={result} ggMax={ggMax} />
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Each dot is one point on the lap — lateral (cornering) vs longitudinal
              (accel/brake) load. A fuller circle means the car is using more of its grip.
            </p>
          </section>

          {/* Time gained / lost */}
          <section>
            <h3 className="tele-label mb-3">Time Gained / Lost per Sector</h3>
            {best ? (
              <div className="space-y-3">
                {result.sectorS.map((sec, i) => {
                  const d = sec - best.sectorS[i];
                  const faster = d < 0;
                  const pct = Math.min(50, Math.abs(d) * 40);
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Sector {i + 1}</span>
                        <span className={`tele-readout font-semibold ${faster ? "text-pos" : "text-neg"}`}>
                          {faster ? "" : "+"}
                          {d.toFixed(3)} s
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-surface-2">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-line-strong" />
                        <div
                          className="absolute top-0 h-full rounded-full"
                          style={{
                            background: faster ? "var(--pos)" : "var(--neg)",
                            width: `${pct}%`,
                            left: faster ? `${50 - pct}%` : "50%",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
                  <span className="font-medium">Total vs best</span>
                  <span
                    className={`tele-readout font-semibold ${
                      result.lapTimeS - best.lapTimeS <= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {result.lapTimeS - best.lapTimeS <= 0 ? "" : "+"}
                    {(result.lapTimeS - best.lapTimeS).toFixed(3)} s
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                This is your baseline lap. Change the setup or track to see time gained/lost.
              </p>
            )}
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GGPlot({ result, ggMax }: { result: SimResult; ggMax: number }) {
  const R = 90;
  const cx = 110;
  const cy = 110;
  const scale = R / ggMax;
  return (
    <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[260px]">
      {[1, 2 / 3, 1 / 3].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={R * f} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="var(--line)" strokeWidth={1} />
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="var(--line)" strokeWidth={1} />
      <text x={cx + R - 2} y={cy - 4} fontSize={9} fill="var(--faint)" textAnchor="end">
        {ggMax.toFixed(1)}g lat
      </text>
      <text x={cx + 4} y={cy - R + 10} fontSize={9} fill="var(--faint)">
        accel
      </text>
      <text x={cx + 4} y={cy + R - 2} fontSize={9} fill="var(--faint)">
        brake
      </text>
      {result.samples.map((s, i) => (
        <circle
          key={i}
          cx={cx + s.latG * scale}
          cy={cy - s.longG * scale}
          r={1.8}
          fill="var(--accent)"
          opacity={0.5}
        />
      ))}
    </svg>
  );
}
