// lib/f1.ts
// Formula One Garage — data model.
//
// One fixed F1 chassis (no visual changes); the user tunes DATA-only setup
// parts. `resolveF1Setup` converts the base car + the current setup into the
// engineering numbers that drive the aero view and the lap simulation, so the
// whole add → dashboard → aero → simulation chain stays in sync from one source.

import type { Car } from "./cars";
import { BMW_I8 } from "./cars";
import type { SimCar } from "./lapsim";

/* ------------------------------------------------------------------ */
/* The fixed F1 chassis (registered like any other car)                */
/* ------------------------------------------------------------------ */

export const F1_CAR_ID = "f1-dallara-gp208";

export const F1_CAR: Car = {
  ...BMW_I8,
  id: F1_CAR_ID,
  brand: "Dallara",
  name: "GP208",
  fullName: "Dallara GP208",
  variant: "Formula · Open-wheel",
  year: "2024",
  tagline: "Pure downforce. Engineered for the limit.",
  modelPath: "/models/f1_dallara_gp208.glb",
  trims: [{ id: "spec", name: "Spec Chassis", price: "—" }],
  dimensions: [
    { label: "Length", value: "5,220 mm" },
    { label: "Width", value: "1,900 mm" },
    { label: "Height", value: "1,095 mm" },
    { label: "Wheelbase", value: "3,135 mm" },
    { label: "Curb Weight", value: "755 kg" },
    { label: "Trunk Space", value: "—" },
  ],
  performance: [
    { label: "Engine", value: "3.4L NA V6" },
    { label: "Horsepower", value: "620 hp" },
    { label: "Torque", value: "540 Nm" },
    { label: "0 – 100 km/h", value: "2.9 s" },
    { label: "Top Speed", value: "335 km/h" },
    { label: "Drivetrain", value: "RWD" },
  ],
  keyFeatures: [
    "Carbon Monocoque",
    "Adjustable Aero Package",
    "Slick Racing Tyres",
    "Push-rod Suspension",
    "Sequential Gearbox",
  ],
  metrics: [
    { label: "Power", value: "620", unit: "hp" },
    { label: "Weight", value: "755", unit: "kg" },
    { label: "0 – 100 km/h", value: "2.9", unit: "s" },
    { label: "Top Speed", value: "335", unit: "km/h" },
    { label: "Power/Weight", value: "821", unit: "hp/t" },
    { label: "Downforce", value: "3.2", unit: "t @ 250" },
  ],
  aero: {
    ...BMW_I8.aero,
    cd: 0.85,
    frontalAreaM2: 1.5,
    lengthM: 5.22,
    separationNote:
      "High-downforce open-wheel aero: large wings and a ground-effect floor trade drag for grip, with significant wake behind the rear wing and wheels.",
  },
  dyn: {
    powerHp: 620,
    massKg: 755,
    topSpeedKmh: 335,
    gears: 6,
  },
};

/* ------------------------------------------------------------------ */
/* Tuneable setup                                                      */
/* ------------------------------------------------------------------ */

export type EngineMode = "conserve" | "balanced" | "attack";
export type TyreCompound = "hard" | "medium" | "soft";
export type RideHeight = "low" | "medium" | "high";

export type F1Setup = {
  /** Front wing angle, 1 (flat) .. 11 (max). */
  frontWing: number;
  /** Rear wing angle, 1 (flat) .. 11 (max). */
  rearWing: number;
  engineMode: EngineMode;
  tyre: TyreCompound;
  rideHeight: RideHeight;
  /** Brake duct opening, 0 (closed) .. 4 (open). */
  brakeDuct: number;
};

export const DEFAULT_F1_SETUP: F1Setup = {
  frontWing: 6,
  rearWing: 6,
  engineMode: "balanced",
  tyre: "medium",
  rideHeight: "medium",
  brakeDuct: 2,
};

/** Metadata describing each tuneable part (drives the Phase 2 setup UI). */
export type TuneablePart =
  | {
      id: keyof F1Setup;
      group: string;
      label: string;
      kind: "range";
      min: number;
      max: number;
      step: number;
      description: string;
    }
  | {
      id: keyof F1Setup;
      group: string;
      label: string;
      kind: "options";
      options: { value: string; label: string }[];
      description: string;
    };

export const TUNEABLE_PARTS: TuneablePart[] = [
  {
    id: "frontWing",
    group: "Aerodynamics",
    label: "Front Wing",
    kind: "range",
    min: 1,
    max: 11,
    step: 1,
    description: "Sets front downforce and turn-in grip. More angle adds drag.",
  },
  {
    id: "rearWing",
    group: "Aerodynamics",
    label: "Rear Wing",
    kind: "range",
    min: 1,
    max: 11,
    step: 1,
    description: "Sets rear downforce and stability. More angle cuts top speed.",
  },
  {
    id: "rideHeight",
    group: "Aerodynamics",
    label: "Ride Height",
    kind: "options",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    description: "Lower ride height boosts ground-effect downforce and lowers drag.",
  },
  {
    id: "engineMode",
    group: "Powertrain",
    label: "Engine Mode",
    kind: "options",
    options: [
      { value: "conserve", label: "Conserve" },
      { value: "balanced", label: "Balanced" },
      { value: "attack", label: "Attack" },
    ],
    description: "Trades power against fuel/energy use and reliability.",
  },
  {
    id: "tyre",
    group: "Mechanical",
    label: "Tyre Compound",
    kind: "options",
    options: [
      { value: "hard", label: "Hard" },
      { value: "medium", label: "Medium" },
      { value: "soft", label: "Soft" },
    ],
    description: "Softer compounds add mechanical grip but degrade faster.",
  },
  {
    id: "brakeDuct",
    group: "Cooling",
    label: "Brake Ducts",
    kind: "range",
    min: 0,
    max: 4,
    step: 1,
    description: "Larger ducts cool the brakes but add a little drag.",
  },
];

/* ------------------------------------------------------------------ */
/* Resolver: setup → engineering spec + sim inputs                     */
/* ------------------------------------------------------------------ */

export type EngineeringSpec = {
  cd: number;
  frontalAreaM2: number;
  /** Composite downforce level 0..1 (feeds the aero + sim downforce). */
  downforce: number;
  /** Downforce force at 250 km/h, Newtons (display). */
  downforceN: number;
  powerHp: number;
  powerKw: number;
  massKg: number;
  topSpeedKmh: number;
  gears: number;
  /** Mechanical (tyre) grip coefficient μ for the lap sim. */
  grip: number;
  frontBalancePct: number;
  brakeCoolingPct: number;
};

const RHO = 1.225;

const RIDE: Record<RideHeight, { df: number; cd: number }> = {
  low: { df: 1.08, cd: 0.97 },
  medium: { df: 1.0, cd: 1.0 },
  high: { df: 0.92, cd: 1.03 },
};
const ENGINE: Record<EngineMode, number> = {
  conserve: 0.93,
  balanced: 1.0,
  attack: 1.05,
};
const TYRE: Record<TyreCompound, number> = {
  hard: 1.42,
  medium: 1.52,
  soft: 1.62,
};

export function resolveF1Setup(car: Car, setup: F1Setup): EngineeringSpec {
  const fwN = (setup.frontWing - 1) / 10; // 0..1
  const rwN = (setup.rearWing - 1) / 10;
  const brakeN = setup.brakeDuct / 4;
  const ride = RIDE[setup.rideHeight];

  // Composite downforce level (0..1).
  const downforce = Math.min(
    1,
    Math.max(0, (0.15 + 0.4 * fwN + 0.45 * rwN) * ride.df),
  );

  // Drag rises with wing angle / ducts; ground effect helps a little.
  const baseCd = car.aero.cd;
  const cd = (baseCd + 0.18 * fwN + 0.3 * rwN + 0.03 * brakeN) * ride.cd;
  const frontalAreaM2 = car.aero.frontalAreaM2;

  // Power from engine mode.
  const powerHp = car.dyn.powerHp * ENGINE[setup.engineMode];
  const powerKw = powerHp * 0.7355;

  // Physically-derived top speed where engine power equals aero drag:
  // P = ½·ρ·Cd·A·v³  →  v = (2P / ρ·Cd·A)^(1/3)
  const vmax = Math.cbrt((2 * powerKw * 1000) / (RHO * cd * frontalAreaM2));
  const topSpeedKmh = Math.round(vmax * 3.6);

  // Mechanical grip from tyre.
  const grip = TYRE[setup.tyre];

  // Downforce force at 250 km/h for display.
  const clA = 0.5 + downforce * 5.0;
  const v250 = 250 / 3.6;
  const downforceN = Math.round(0.5 * RHO * clA * v250 * v250);

  const frontBalancePct = Math.max(
    40,
    Math.min(58, 47 + (setup.frontWing - setup.rearWing) * 0.7),
  );
  const brakeCoolingPct = 40 + setup.brakeDuct * 15;

  return {
    cd: +cd.toFixed(3),
    frontalAreaM2,
    downforce,
    downforceN,
    powerHp: Math.round(powerHp),
    powerKw: Math.round(powerKw),
    massKg: car.dyn.massKg,
    topSpeedKmh,
    gears: car.dyn.gears,
    grip,
    frontBalancePct: Math.round(frontBalancePct),
    brakeCoolingPct,
  };
}

/** Convert an engineering spec into lap-sim inputs. */
export function specToSim(spec: EngineeringSpec): {
  simCar: SimCar;
  grip: number;
  downforce: number;
} {
  return {
    simCar: {
      powerHp: spec.powerHp,
      massKg: spec.massKg,
      topSpeedKmh: spec.topSpeedKmh,
      cd: spec.cd,
      frontalAreaM2: spec.frontalAreaM2,
      gears: spec.gears,
    },
    grip: spec.grip,
    downforce: spec.downforce,
  };
}
