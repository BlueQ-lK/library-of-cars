"use client";

import { useDashboard } from "@/lib/store";
import { Sun, Play, Car as CarIcon, Maximize2, Wind } from "lucide-react";

export function StageTabs() {
  const stageView = useDashboard((s) => s.stageView);
  const setStageView = useDashboard((s) => s.setStageView);

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1 shadow-sm">
      {(["exterior", "interior"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setStageView(v)}
          className={`rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
            stageView === v
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function ThreeSixtyBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium shadow-sm">
      <span>360°</span>
    </div>
  );
}

export function StageControls() {
  const aeroMode = useDashboard((s) => s.aeroMode);
  const toggleAeroMode = useDashboard((s) => s.toggleAeroMode);

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1.5 shadow-sm">
      {[Sun, Play, CarIcon].map((Icon, i) => (
        <button
          key={i}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Icon size={17} strokeWidth={1.75} />
        </button>
      ))}

      {/* Aerodynamics Explorer toggle */}
      <button
        onClick={toggleAeroMode}
        aria-pressed={aeroMode}
        title="Aerodynamics Explorer"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          aeroMode
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        }`}
      >
        <Wind size={17} strokeWidth={1.75} />
      </button>

      <button className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
        <Maximize2 size={17} strokeWidth={1.75} />
      </button>
    </div>
  );
}
