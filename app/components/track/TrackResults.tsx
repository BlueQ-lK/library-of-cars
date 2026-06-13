"use client";

import type { Track } from "@/lib/tracks";
import type { SimResult } from "@/lib/lapsim";
import { formatLapTime } from "@/lib/lapsim";
import { Route, Spline, Minus, Mountain, ChevronRight, Info } from "lucide-react";
import CountUp from "../common/CountUp";

export type Best = { lapTimeS: number; sectorS: [number, number, number] } | null;

export default function TrackResults({
  track,
  result,
  best,
  downforce,
  setDownforce,
  onOpenReport,
}: {
  track: Track;
  result: SimResult;
  best: Best;
  downforce: number;
  setDownforce: (d: number) => void;
  onOpenReport: () => void;
}) {
  const lapDelta = best ? result.lapTimeS - best.lapTimeS : 0;
  const isBest = !best || result.lapTimeS <= best.lapTimeS + 1e-6;

  return (
    <aside className="flex w-[330px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-white px-5 py-5">
      {/* Track overview */}
      <section>
        <h3 className="tele-label mb-2.5">Track Overview</h3>
        <div className="grid grid-cols-2 gap-2">
          <Overview icon={Route} label="Length" value={`${(track.lengthM / 1000).toFixed(2)} km`} />
          <Overview icon={Spline} label="Corners" value={`${track.corners}`} />
          <Overview icon={Minus} label="Straights" value={`${track.straights}`} />
          <Overview icon={Mountain} label="Elevation" value={`${track.elevationM} m`} />
        </div>
      </section>

      {/* Simulation result */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="tele-label">Simulation Result</h3>
          {isBest && (
            <span className="rounded-full bg-pos/10 px-2 py-0.5 text-[10px] font-medium text-pos">
              Best Lap
            </span>
          )}
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="text-[11px] text-faint">Lap Time</div>
          <div className="flex items-baseline gap-2">
            <span className="tele-readout text-2xl font-bold">
              {formatLapTime(result.lapTimeS)}
            </span>
            {best && Math.abs(lapDelta) > 0.001 && (
              <Delta value={lapDelta} />
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-faint">vs previous best</div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Avg Speed" unit="km/h">
            <CountUp value={Math.round(result.avgSpeedKmh)} />
          </Stat>
          <Stat label="Peak Speed" unit="km/h">
            <CountUp value={Math.round(result.peakSpeedKmh)} />
          </Stat>
          <Stat label="Peak Lateral G" unit="g">
            <CountUp value={result.peakLatG} decimals={1} />
          </Stat>
          <Stat label="Top Speed" unit="km/h">
            <CountUp value={Math.round(result.topSpeedKmh)} />
          </Stat>
        </div>
      </section>

      {/* Sector times */}
      <section>
        <h3 className="tele-label mb-2.5">Sector Times</h3>
        <div className="grid grid-cols-3 gap-2">
          {result.sectorS.map((sec, i) => {
            const d = best ? sec - best.sectorS[i] : 0;
            return (
              <div key={i} className="rounded-lg border border-line p-2 text-center">
                <div className="text-[10px] text-faint">S{i + 1}</div>
                <div className="tele-readout text-sm font-semibold">{sec.toFixed(3)}</div>
                {best && Math.abs(d) > 0.001 && (
                  <div className="mt-0.5 flex justify-center">
                    <Delta value={d} small />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Downforce setup */}
      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <h3 className="tele-label">Downforce Setup</h3>
          <Info size={12} className="text-faint" />
        </div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Low</span>
          <span className="tele-readout font-semibold">{Math.round(downforce * 100)}%</span>
          <span className="text-muted-foreground">High</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={downforce}
          onChange={(e) => setDownforce(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
          aria-label="Downforce setup"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          More downforce = better cornering, lower top speed.
        </p>
      </section>

      <button
        onClick={onOpenReport}
        className="mt-auto flex items-center justify-center gap-1 rounded-xl border border-line py-2.5 text-sm font-medium transition-colors hover:bg-surface"
      >
        View Detailed Report
        <ChevronRight size={15} />
      </button>
    </aside>
  );
}

function Overview({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-2 text-muted-foreground">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] text-faint">{label}</div>
        <div className="tele-readout text-sm font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Stat({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line px-2.5 py-2">
      <div className="text-[10px] text-faint">{label}</div>
      <div className="tele-readout text-sm font-semibold">
        {children}
        {unit ? <span className="ml-0.5 text-[10px] font-normal text-faint">{unit}</span> : null}
      </div>
    </div>
  );
}

function Delta({ value, small }: { value: number; small?: boolean }) {
  const faster = value < 0;
  return (
    <span
      className={`rounded ${small ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[11px]"} font-medium ${
        faster ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"
      }`}
    >
      {faster ? "" : "+"}
      {value.toFixed(3)} s
    </span>
  );
}
