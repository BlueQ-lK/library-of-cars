// lib/cars.ts
// Data model + accessors for tele-car.
// The actual car records live in the static data source `data/cars.json`
// (loaded once into the runtime car registry — see lib/carRegistry.ts).
// This module owns the TYPES and a few convenience accessors / fallbacks.

import carsData from "@/data/cars.json";

export type Trim = {
  id: string;
  name: string;
  price: string;
};

export type PaintOption = {
  id: string;
  name: string;
  /** Hex applied to the GLB "paint" material. */
  hex: string;
  metallic?: boolean;
};

export type InteriorOption = {
  id: string;
  name: string;
  hex: string;
};

export type SpecRow = {
  label: string;
  value: string;
};

export type ConfigOption = {
  /** category, e.g. "Wheels" */
  label: string;
  /** chosen value, e.g. 20" Radial Spoke */
  value: string;
};

export type Metric = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
};

/* ------------------------------------------------------------------ */
/* Aerodynamics Explorer data model                                    */
/* ------------------------------------------------------------------ */

export type AeroViewId = "all" | "external" | "underbody" | "cooling" | "wake";

export type AeroScenarioId =
  | "city"
  | "highway"
  | "track"
  | "crosswind"
  | "wet";

export type AeroComponentId =
  | "front-splitter"
  | "air-curtains"
  | "side-skirts"
  | "rear-diffuser"
  | "active-grille"
  | "cooling-vents"
  | "rear-spoiler";

export type AeroComponent = {
  id: AeroComponentId;
  name: string;
  /** Views in which this component is most relevant / highlighted. */
  views: AeroViewId[];
  /** What the part does. */
  purpose: string;
  /** Why engineers design it the way they do. */
  design: string;
  /** Quantified / qualitative effect on performance. */
  impact: string;
  /** Normalized hotspot position on the 2D side view (0..1). */
  x: number;
  y: number;
};

export type AeroMetrics = {
  /** Drag coefficient (Cd) at this scenario. */
  cd: number;
  /** Aerodynamic drag force, Newtons. */
  dragForceN: number;
  /** Net downforce (positive) or lift (negative), Newtons. */
  downforceN: number;
  /** Front/rear lift balance, percent front (50 = neutral). */
  frontLiftPct: number;
  /** Cooling airflow index, 0..100. */
  coolingFlow: number;
  /** Overall aerodynamic efficiency, 0..100. */
  efficiency: number;
  /** High-speed stability index, 0..100. */
  stability: number;
};

export type AeroScenario = {
  id: AeroScenarioId;
  name: string;
  speedKmh: number;
  description: string;
  /** Relative streamline animation speed multiplier (1 = baseline). */
  flowSpeed: number;
  /** Turbulence / separation intensity, 0..1 (drives wake size). */
  turbulence: number;
  /** Optional lateral yaw flow, 0..1 (crosswind). */
  yaw?: number;
  /** Whether the scenario adds spray/wet visualization. */
  wet?: boolean;
  metrics: AeroMetrics;
};

export type AeroViewMeta = {
  id: AeroViewId;
  name: string;
  blurb: string;
};

export type AeroData = {
  /** Baseline drag coefficient (clean configuration). */
  cd: number;
  /** Frontal area, m² (fallback; the live value is measured from the mesh). */
  frontalAreaM2: number;
  /** Real-world overall length, metres — used to scale mesh measurements. */
  lengthM: number;
  /** Where flow separates from the body (educational note). */
  separationNote: string;
  views: AeroViewMeta[];
  components: AeroComponent[];
  scenarios: AeroScenario[];
};

export type Car = {
  id: string;
  brand: string;
  name: string;
  fullName: string;
  variant: string;
  year: string;
  tagline: string;
  modelPath: string;

  trims: Trim[];

  exteriorColors: PaintOption[];
  /** label shown under the exterior swatches */
  exteriorColorLabel: string;

  interiorColors: InteriorOption[];
  /** label shown under the interior swatches */
  interiorColorLabel: string;

  /** Left sidebar dimensions list. */
  dimensions: SpecRow[];

  /** Right sidebar performance list. */
  performance: SpecRow[];

  /** Right sidebar key features. */
  keyFeatures: string[];

  /** Right sidebar configure list. */
  configure: ConfigOption[];

  /** Bottom metric bar. */
  metrics: Metric[];

  /** Aerodynamics Explorer dataset. */
  aero: AeroData;

  /** Numeric dynamics used by the Track Lab lap simulator. */
  dyn: DynSpec;
};

/** Numeric performance inputs for the lap simulation. */
export type DynSpec = {
  /** Peak power, metric horsepower. */
  powerHp: number;
  /** Curb mass, kilograms. */
  massKg: number;
  /** Manufacturer top speed, km/h. */
  topSpeedKmh: number;
  /** Number of forward gears (for the gear readout). */
  gears: number;
};

/* ------------------------------------------------------------------ */
/* Static data source (data/cars.json)                                 */
/* ------------------------------------------------------------------ */

/** All cars from the bundled static data file. */
export const CARS: Car[] = carsData as unknown as Car[];

/** Default car — used to seed defaults and as a fallback. */
export const BMW_I8: Car = CARS[0];

/** Look up a car by id, falling back to the first car. */
export function getCar(id: string): Car {
  return CARS.find((c) => c.id === id) ?? CARS[0];
}
