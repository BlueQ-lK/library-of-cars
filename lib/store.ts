"use client";

import { create } from "zustand";
import { BMW_I8 } from "./cars";
import type { AeroViewId, AeroScenarioId, AeroComponentId } from "./cars";

export type StageView = "exterior" | "interior";

type DashboardState = {
  carId: string;
  trimId: string;
  colorId: string;
  colorHex: string;
  interiorId: string;
  stageView: StageView;

  // Layout
  leftOpen: boolean;
  rightOpen: boolean;

  // Aerodynamics Explorer
  aeroMode: boolean;
  aeroView: AeroViewId;
  aeroScenario: AeroScenarioId;
  aeroComponent: AeroComponentId | null;
  /** Continuous wind speed in km/h (0–250) driving the visualization. */
  aeroSpeedKmh: number;
  /** Frontal area (m²) measured from the loaded 3D mesh, null until computed. */
  derivedFrontalArea: number | null;

  // Track Lab (lap simulator)
  labMode: boolean;
  trackId: string;
  trackWet: boolean;
  trackCompare: boolean;
  /** Downforce setup, 0 (low) .. 1 (high). */
  downforce: number;

  setTrim: (id: string) => void;
  setColor: (id: string, hex: string) => void;
  setInterior: (id: string) => void;
  setStageView: (view: StageView) => void;

  toggleLeft: () => void;
  toggleRight: () => void;

  toggleAeroMode: () => void;
  setAeroView: (view: AeroViewId) => void;
  setAeroScenario: (scenario: AeroScenarioId) => void;
  setAeroComponent: (id: AeroComponentId | null) => void;
  setAeroSpeed: (kmh: number) => void;
  setDerivedFrontalArea: (area: number | null) => void;

  setLabMode: (on: boolean) => void;
  setTrack: (id: string) => void;
  setTrackWet: (wet: boolean) => void;
  setTrackCompare: (on: boolean) => void;
  setDownforce: (d: number) => void;
};

const defaultColor = BMW_I8.exteriorColors[1]; // Protonic Blue

export const useDashboard = create<DashboardState>((set) => ({
  carId: BMW_I8.id,
  trimId: BMW_I8.trims[0].id,
  colorId: defaultColor.id,
  colorHex: defaultColor.hex,
  interiorId: BMW_I8.interiorColors[0].id,
  stageView: "exterior",

  leftOpen: true,
  rightOpen: true,

  aeroMode: false,
  aeroView: "external",
  aeroScenario: "highway",
  aeroComponent: null,
  aeroSpeedKmh: 120,
  derivedFrontalArea: null,

  labMode: false,
  trackId: "technical",
  trackWet: false,
  trackCompare: false,
  downforce: 0.65,

  setTrim: (id) => set({ trimId: id }),
  setColor: (id, hex) => set({ colorId: id, colorHex: hex }),
  setInterior: (id) => set({ interiorId: id }),
  setStageView: (view) => set({ stageView: view }),

  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),

  toggleAeroMode: () =>
    set((s) => ({ aeroMode: !s.aeroMode, aeroComponent: null })),
  setAeroView: (view) => set({ aeroView: view }),
  setAeroScenario: (scenario) => set({ aeroScenario: scenario }),
  setAeroComponent: (id) =>
    set((s) => ({ aeroComponent: s.aeroComponent === id ? null : id })),
  setAeroSpeed: (kmh) =>
    set({ aeroSpeedKmh: Math.max(0, Math.min(250, Math.round(kmh))) }),
  setDerivedFrontalArea: (area) => set({ derivedFrontalArea: area }),

  setLabMode: (on) => set({ labMode: on }),
  setTrack: (id) => set({ trackId: id }),
  setTrackWet: (wet) => set({ trackWet: wet }),
  setTrackCompare: (on) => set({ trackCompare: on }),
  setDownforce: (d) => set({ downforce: Math.max(0, Math.min(1, d)) }),
}));
