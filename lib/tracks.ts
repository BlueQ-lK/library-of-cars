// lib/tracks.ts
// F1-style circuit definitions for the Track Lab lap simulator.
// Centerline control points are authored in a normalized space (roughly
// -1.4..1.4 in X, -0.9..0.9 in Y) and smoothed into a closed loop at runtime.
// `lengthM` sets the real lap length used for timing; the geometry is scaled
// to match it. Corner/straight/elevation figures are illustrative metadata.

export type TrackPoint = { x: number; y: number };

export type TrackType = "technical" | "street" | "power";

export type Track = {
  id: string;
  name: string;
  type: TrackType;
  /** Closed-loop centerline control points (normalized). */
  points: TrackPoint[];
  /** Real lap length, metres. */
  lengthM: number;
  /** Display metadata. */
  corners: number;
  straights: number;
  elevationM: number;
};

const TECHNICAL: Track = {
  id: "technical",
  name: "Technical Circuit",
  type: "technical",
  lengthM: 5210,
  corners: 18,
  straights: 3,
  elevationM: 42,
  points: [
    { x: -1.15, y: -0.1 },
    { x: -1.08, y: 0.28 },
    { x: -0.72, y: 0.34 },
    { x: -0.5, y: 0.12 },
    { x: -0.28, y: 0.34 },
    { x: -0.05, y: 0.76 },
    { x: 0.28, y: 0.86 },
    { x: 0.55, y: 0.62 },
    { x: 0.6, y: 0.32 },
    { x: 0.96, y: 0.36 },
    { x: 1.26, y: 0.06 },
    { x: 1.16, y: -0.34 },
    { x: 0.72, y: -0.46 },
    { x: 0.24, y: -0.4 },
    { x: -0.04, y: -0.16 },
    { x: -0.34, y: -0.5 },
    { x: -0.74, y: -0.46 },
    { x: -1.04, y: -0.42 },
  ],
};

const STREET: Track = {
  id: "street",
  name: "Street Circuit",
  type: "street",
  lengthM: 3337,
  corners: 14,
  straights: 4,
  elevationM: 18,
  points: [
    { x: -1.12, y: -0.52 },
    { x: -1.12, y: 0.5 },
    { x: -0.62, y: 0.56 },
    { x: -0.52, y: 0.24 },
    { x: -0.22, y: 0.3 },
    { x: -0.12, y: 0.62 },
    { x: 0.5, y: 0.62 },
    { x: 0.56, y: 0.2 },
    { x: 1.06, y: 0.22 },
    { x: 1.12, y: -0.42 },
    { x: 0.5, y: -0.56 },
    { x: 0.44, y: -0.2 },
    { x: 0.0, y: -0.26 },
    { x: -0.06, y: -0.56 },
  ],
};

const POWER: Track = {
  id: "power",
  name: "Power Circuit",
  type: "power",
  lengthM: 5793,
  corners: 11,
  straights: 5,
  elevationM: 30,
  points: [
    { x: -1.32, y: -0.28 },
    { x: -1.32, y: 0.32 },
    { x: -0.2, y: 0.46 },
    { x: 0.02, y: 0.2 },
    { x: 0.24, y: 0.46 },
    { x: 1.2, y: 0.36 },
    { x: 1.38, y: -0.04 },
    { x: 1.12, y: -0.42 },
    { x: 0.0, y: -0.52 },
    { x: -1.0, y: -0.46 },
  ],
};

export const TRACKS: Track[] = [TECHNICAL, STREET, POWER];

export function getTrack(id: string): Track {
  return TRACKS.find((t) => t.id === id) ?? TECHNICAL;
}
