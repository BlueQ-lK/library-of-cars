"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Car } from "@/lib/cars";
import { getTrack } from "@/lib/tracks";
import { simulateLap } from "@/lib/lapsim";
import type { SimCar } from "@/lib/lapsim";
import { useDashboard } from "@/lib/store";
import { useTrackAudio } from "@/lib/useTrackAudio";
import { downloadResultCard } from "@/lib/shareCard";
import TrackSidebar from "./TrackSidebar";
import TrackMap from "./TrackMap";
import TrackTelemetry from "./TrackTelemetry";
import TrackResults, { type Best } from "./TrackResults";
import DetailedReport from "./DetailedReport";
import {
  ChevronLeft,
  Heart,
  Share2,
  Play,
  Pause,
  RotateCcw,
  Camera,
  LineChart,
  Volume2,
  VolumeX,
} from "lucide-react";

const PLAY_DURATION_S = 16; // real seconds to watch a full lap

export default function TrackLab({ car }: { car: Car }) {
  const trackId = useDashboard((s) => s.trackId);
  const wet = useDashboard((s) => s.trackWet);
  const downforce = useDashboard((s) => s.downforce);
  const setDownforce = useDashboard((s) => s.setDownforce);
  const setLabMode = useDashboard((s) => s.setLabMode);

  const track = getTrack(trackId);
  const grip = wet ? 0.78 : 1.0;

  const simCar: SimCar = useMemo(
    () => ({
      powerHp: car.dyn.powerHp,
      massKg: car.dyn.massKg,
      topSpeedKmh: car.dyn.topSpeedKmh,
      cd: car.aero.cd,
      frontalAreaM2: car.aero.frontalAreaM2,
      gears: car.dyn.gears,
    }),
    [car],
  );

  const result = useMemo(
    () => simulateLap(track, simCar, { grip, downforce }),
    [track, simCar, grip, downforce],
  );

  // Best-lap tracking (delta vs the fastest lap seen so far).
  const [best, setBest] = useState<Best>(null);
  useEffect(() => {
    setBest((prev) =>
      !prev || result.lapTimeS < prev.lapTimeS
        ? { lapTimeS: result.lapTimeS, sectorS: result.sectorS }
        : prev,
    );
  }, [result]);

  // Playback clock.
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const progress = useRef(0); // 0..1 around the lap
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  // Engine + tyre audio tied to the current telemetry sample.
  const cur = result.samples[Math.min(index, result.samples.length - 1)];
  useTrackAudio({
    enabled: soundOn,
    playing,
    speedKmh: cur.speedKmh,
    throttle: cur.throttle,
    latG: cur.latG,
    topSpeedKmh: car.dyn.topSpeedKmh,
  });

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (last.current == null) last.current = ts;
      const dt = (ts - last.current) / 1000;
      last.current = ts;
      progress.current = (progress.current + dt / PLAY_DURATION_S) % 1;
      const tau = progress.current * result.lapTimeS;
      const samples = result.samples;
      let i = 0;
      for (let k = 0; k < samples.length; k++) {
        if (samples[k].t <= tau) i = k;
        else break;
      }
      setIndex(i);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, result]);

  const run = () => {
    progress.current = 0;
    setIndex(0);
    setPlaying(true);
  };
  const reset = () => {
    progress.current = 0;
    setIndex(0);
    setPlaying(false);
  };

  return (
    <motion.div
      className="relative flex h-full w-full min-w-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <TrackSidebar car={car} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLabMode(false)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface"
            >
              <ChevronLeft size={16} />
              Exit Track Lab
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">Track Lab</h1>
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  Beta
                </span>
              </div>
              <div className="text-[11px] text-faint">Lap Simulator</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface">
              <Heart size={16} />
              Save
            </button>
            <button
              onClick={() =>
                downloadResultCard({
                  carName: car.fullName,
                  track,
                  result,
                  downforce,
                  wet,
                })
              }
              className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
            >
              <Share2 size={16} />
              Share
            </button>
            <button
              onClick={run}
              className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Play size={16} />
              Run Simulation
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Center */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="min-h-[320px] flex-1">
              <TrackMap result={result} index={index} />
            </div>

            {/* Playback controls */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1.5 shadow-sm">
                <Ctrl icon={Play} label="Play" onClick={() => setPlaying(true)} active={playing} />
                <Ctrl icon={Pause} label="Pause" onClick={() => setPlaying(false)} active={!playing} />
                <Ctrl icon={RotateCcw} label="Reset" onClick={reset} />
                <Ctrl icon={Camera} label="Camera" onClick={() => {}} />
                <Ctrl
                  icon={LineChart}
                  label="Telemetry"
                  onClick={() => setShowTelemetry((v) => !v)}
                  active={showTelemetry}
                />
                <Ctrl
                  icon={soundOn ? Volume2 : VolumeX}
                  label="Sound"
                  onClick={() => setSoundOn((v) => !v)}
                  active={soundOn}
                />
              </div>
            </div>

            {showTelemetry && (
              <TrackTelemetry
                result={result}
                index={index}
                lapDistanceKm={track.lengthM / 1000}
              />
            )}
          </div>

          <TrackResults
            track={track}
            result={result}
            best={best}
            downforce={downforce}
            setDownforce={setDownforce}
            onOpenReport={() => setReportOpen(true)}
          />
        </div>
      </div>

      <AnimatePresence>
        {reportOpen && (
          <DetailedReport
            track={track}
            result={result}
            best={best}
            carName={car.fullName}
            onClose={() => setReportOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Ctrl({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
    </button>
  );
}
