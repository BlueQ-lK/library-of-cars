// lib/lapsim.ts
// Quasi-steady-state lap simulation. NOT a full vehicle dynamics model — a
// corner-speed limit plus forward (acceleration) and backward (braking) passes,
// the standard technique for fast, realistic-looking lap-time estimates.

import type { Track, TrackPoint } from "./tracks";

export type Sample = {
  s: number; // distance along the lap, m
  t: number; // cumulative time to reach this station, s
  x: number; // normalized position (for rendering)
  y: number;
  speedKmh: number;
  throttle: number; // 0..1
  brake: number; // 0..1
  latG: number;
  longG: number;
  gear: number;
};

export type CornerMarker = { number: number; x: number; y: number; s: number };

export type SimResult = {
  samples: Sample[];
  lapTimeS: number;
  sectorS: [number, number, number];
  avgSpeedKmh: number;
  peakSpeedKmh: number;
  topSpeedKmh: number;
  peakLatG: number;
  corners: CornerMarker[];
};

export type SimCar = {
  powerHp: number;
  massKg: number;
  topSpeedKmh: number;
  cd: number;
  frontalAreaM2: number;
  gears: number;
};

export type SimOptions = {
  /** Base tyre/asphalt friction coefficient (dry ≈ 1.0, wet ≈ 0.7). */
  grip: number;
  /** Downforce setup, 0 (low) .. 1 (high). */
  downforce: number;
  /** Number of stations to integrate (higher = smoother). */
  stations?: number;
};

const G = 9.81;
const RHO = 1.225;
const CRR = 0.012; // rolling resistance coefficient
const HP_TO_W = 735.5; // metric horsepower → watts

/* ------------------------------------------------------------------ */
/* Geometry: smooth + resample the centerline                          */
/* ------------------------------------------------------------------ */

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Dense, smooth, closed polyline from control points. */
function densify(points: TrackPoint[], perSeg: number): TrackPoint[] {
  const n = points.length;
  const out: TrackPoint[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let j = 0; j < perSeg; j++) {
      const t = j / perSeg;
      out.push({ x: catmull(p0.x, p1.x, p2.x, p3.x, t), y: catmull(p0.y, p1.y, p2.y, p3.y, t) });
    }
  }
  return out;
}

/** Resample a closed polyline into N points equally spaced by arc length. */
function resampleEqual(poly: TrackPoint[], n: number): { pts: TrackPoint[]; perim: number } {
  const m = poly.length;
  const cum: number[] = [0];
  for (let i = 1; i <= m; i++) {
    const a = poly[i - 1];
    const b = poly[i % m];
    cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const perim = cum[m];
  const step = perim / n;
  const pts: TrackPoint[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const target = i * step;
    while (seg < m - 1 && cum[seg + 1] < target) seg++;
    const segLen = cum[seg + 1] - cum[seg] || 1;
    const f = (target - cum[seg]) / segLen;
    const a = poly[seg];
    const b = poly[(seg + 1) % m];
    pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
  return { pts, perim };
}

/* ------------------------------------------------------------------ */
/* The simulation                                                      */
/* ------------------------------------------------------------------ */

export function simulateLap(track: Track, car: SimCar, opts: SimOptions): SimResult {
  const N = opts.stations ?? 360;
  const dense = densify(track.points, 26);
  const { pts, perim } = resampleEqual(dense, N);

  const ds = track.lengthM / N; // real spacing between stations, m
  const normToM = track.lengthM / perim; // normalized unit → metres

  // Curvature κ at each station (1/m), from the turn angle over real spacing.
  const kappa = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = pts[(i - 1 + N) % N];
    const b = pts[i];
    const c = pts[(i + 1) % N];
    const v1x = (b.x - a.x) * normToM;
    const v1y = (b.y - a.y) * normToM;
    const v2x = (c.x - b.x) * normToM;
    const v2y = (c.y - b.y) * normToM;
    const cross = v1x * v2y - v1y * v2x;
    const dot = v1x * v2x + v1y * v2y;
    const dTheta = Math.atan2(Math.abs(cross), dot);
    kappa[i] = dTheta / ds;
  }

  // Car / setup parameters.
  const P = car.powerHp * HP_TO_W;
  const m = car.massKg;
  const vTop = car.topSpeedKmh / 3.6;
  const mu = opts.grip;
  const cdA = car.cd * car.frontalAreaM2 * (1 + 0.6 * opts.downforce); // wing adds drag
  const clA = 0.2 + 3.0 * opts.downforce; // downforce coefficient × area

  // Drive / brake helpers.
  const driveAccel = (v: number): number => {
    const vv = Math.max(v, 4);
    const grip = mu * (m * G + 0.5 * RHO * clA * vv * vv);
    const fDrive = Math.min(P / vv, grip);
    const fDrag = 0.5 * RHO * cdA * vv * vv;
    const fRoll = CRR * m * G;
    return (fDrive - fDrag - fRoll) / m;
  };
  const brakeDecel = (v: number): number => {
    const vv = Math.max(v, 4);
    const tyre = mu * (G + (0.5 * RHO * clA * vv * vv) / m);
    const aero = (0.5 * RHO * cdA * vv * vv) / m;
    return tyre + aero;
  };

  // 1) Corner-limited speed from lateral grip (downforce grows with v²).
  const vCorner = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const k = kappa[i];
    const denom = m * k - 0.5 * mu * RHO * clA;
    let v = vTop;
    if (denom > 1e-6) v = Math.sqrt((mu * m * G) / denom);
    vCorner[i] = Math.min(v, vTop);
  }

  // Start the passes at the slowest corner for a consistent closed lap.
  let start = 0;
  for (let i = 1; i < N; i++) if (vCorner[i] < vCorner[start]) start = i;

  // 2) Forward pass (acceleration out of corners).
  const vf = new Float64Array(N);
  vf[start] = vCorner[start];
  for (let k = 1; k <= N; k++) {
    const i = (start + k) % N;
    const prev = (start + k - 1 + N) % N;
    const a = driveAccel(vf[prev]);
    const v = Math.sqrt(Math.max(0, vf[prev] * vf[prev] + 2 * a * ds));
    vf[i] = Math.min(v, vCorner[i], vTop);
  }

  // 3) Backward pass (braking into corners).
  const vb = new Float64Array(N);
  vb[start] = vCorner[start];
  for (let k = 1; k <= N; k++) {
    const i = (start - k + N * 2) % N;
    const next = (start - k + 1 + N * 2) % N;
    const dec = brakeDecel(vb[next]);
    const v = Math.sqrt(Math.max(0, vb[next] * vb[next] + 2 * dec * ds));
    vb[i] = Math.min(v, vCorner[i], vTop);
  }

  // 4) Final profile = min of both passes.
  const v = new Float64Array(N);
  for (let i = 0; i < N; i++) v[i] = Math.max(2, Math.min(vf[i], vb[i]));

  // 5) Build samples + timing.
  const samples: Sample[] = new Array(N);
  const sector: [number, number, number] = [0, 0, 0];
  let lapTime = 0;
  let peakSpeed = 0;
  let peakLat = 0;

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const a = (v[next] * v[next] - v[i] * v[i]) / (2 * ds);
    const longG = a / G;
    const latG = (v[i] * v[i] * kappa[i]) / G;

    const maxA = driveAccel(v[i]);
    const maxB = brakeDecel(v[i]);
    const throttle = a > 0 ? Math.min(1, a / Math.max(maxA, 0.2)) : 0;
    const brake = a < 0 ? Math.min(1, -a / Math.max(maxB, 0.2)) : 0;
    const gear = Math.max(1, Math.min(car.gears, Math.ceil((v[i] / vTop) * car.gears)));

    samples[i] = {
      s: i * ds,
      t: lapTime,
      x: pts[i].x,
      y: pts[i].y,
      speedKmh: v[i] * 3.6,
      throttle,
      brake,
      latG,
      longG,
      gear,
    };

    const vAvg = (v[i] + v[next]) / 2;
    const dt = ds / Math.max(vAvg, 1);
    lapTime += dt;
    const third = Math.floor((i / N) * 3);
    sector[Math.min(2, third)] += dt;

    if (samples[i].speedKmh > peakSpeed) peakSpeed = samples[i].speedKmh;
    if (latG > peakLat) peakLat = latG;
  }

  // 6) Corner markers: local maxima of curvature above a threshold.
  const corners: CornerMarker[] = [];
  const thresh = 0.01;
  let num = 1;
  for (let i = 0; i < N; i++) {
    const prev = kappa[(i - 1 + N) % N];
    const cur = kappa[i];
    const nxt = kappa[(i + 1) % N];
    if (cur > thresh && cur >= prev && cur > nxt) {
      // avoid duplicates very close together
      const last = corners[corners.length - 1];
      if (!last || Math.abs(i * ds - last.s) > track.lengthM * 0.025) {
        corners.push({ number: num++, x: pts[i].x, y: pts[i].y, s: i * ds });
      }
    }
  }

  return {
    samples,
    lapTimeS: lapTime,
    sectorS: sector,
    avgSpeedKmh: (track.lengthM / lapTime) * 3.6,
    peakSpeedKmh: peakSpeed,
    topSpeedKmh: peakSpeed,
    peakLatG: peakLat,
    corners,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers for the UI                                                  */
/* ------------------------------------------------------------------ */

/** Format seconds as M:SS.mmm */
export function formatLapTime(s: number): string {
  if (!isFinite(s)) return "--:--.---";
  const mins = Math.floor(s / 60);
  const secs = s - mins * 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

/** Speed (km/h) → telemetry heat color (blue → green → yellow → red). */
export function speedColor(kmh: number): string {
  const stops: [number, [number, number, number]][] = [
    [60, [37, 99, 235]],
    [120, [22, 184, 148]],
    [180, [120, 200, 60]],
    [240, [230, 170, 0]],
    [300, [229, 72, 77]],
  ];
  const x = Math.max(stops[0][0], Math.min(stops[stops.length - 1][0], kmh));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [s0, c0] = stops[i - 1];
      const [s1, c1] = stops[i];
      const f = (x - s0) / (s1 - s0 || 1);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
      return `rgb(${r},${g},${b})`;
    }
  }
  return "rgb(229,72,77)";
}
