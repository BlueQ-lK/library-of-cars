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
  /** Frontal area (m²) measured from the loaded 3D mesh, null until computed. */
  derivedFrontalArea: number | null;

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
  setDerivedFrontalArea: (area: number | null) => void;
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
  derivedFrontalArea: null,

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
  setDerivedFrontalArea: (area) => set({ derivedFrontalArea: area }),
}));
