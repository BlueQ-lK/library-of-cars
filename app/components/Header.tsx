"use client";

import type { Car } from "@/lib/cars";
import { useDashboard } from "@/lib/store";
import { ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";

export default function Header({ car }: { car: Car }) {
  const setLabMode = useDashboard((s) => s.setLabMode);
  return (
    <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
      {/* Left: back + title + breadcrumb */}
      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted-foreground transition-colors hover:bg-surface">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">{car.fullName}</h1>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {car.year}
        </span>
        <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          Change Model
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface">
          <Heart size={16} />
          Save
        </button>
        <button className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface">
          <Share2 size={16} />
          Share
        </button>
        <button
          onClick={() => setLabMode(true)}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Run Lab Test
        </button>
      </div>
    </header>
  );
}
