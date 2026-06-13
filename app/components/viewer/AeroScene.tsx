"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Environment,
  Lightformer,
  Html,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import CarModel from "./CarModel";
import { useDashboard } from "@/lib/store";
import { useCurrentCar } from "@/lib/carRegistry";
import type { AeroViewId, AeroScenario } from "@/lib/cars";

type Axis = "x" | "z";

const NORMALIZED_MAX = 3.2; // CarModel scales the longest dimension to this.

const C_EXTERNAL = "#2f7bff"; // blue — smooth external flow
const C_UNDER = "#16a34a"; // green — underbody
const C_COOL_HOT = new THREE.Color("#ff8c1a"); // orange — cooling in
const C_COOL_COOL = new THREE.Color("#ffd27a");
const C_WAKE_HOT = new THREE.Color("#ff7a3c"); // orange→red turbulent wake
const C_WAKE_DEEP = new THREE.Color("#c81e1e");
const C_FAINT = "#b9c2d0";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1)));
  return t * t * (3 - 2 * t);
}
function smax(a: number, b: number, k: number): number {
  return Math.max(a, b) + k * Math.log(1 + Math.exp(-Math.abs(a - b) / k));
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function rnd(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

type Silhouette = { samples: Float32Array; aLo: number; aHi: number };

/** Derived per-frame visualization parameters from the speed slider. */
type Flow = {
  norm: number; // 0..1 (speed / 250)
  flowSpeed: number; // streamline / particle travel speed
  turb: number; // 0..1 turbulence intensity (wake)
};

/* ------------------------------------------------------------------ */
/* Streamline tube definitions (continuous, body-hugging)              */
/* ------------------------------------------------------------------ */

type TubeDef = {
  points: THREE.Vector3[];
  color: string;
  base: number; // opacity
  fade: number; // fade toward rear from this u
  reps: number;
  radius: number;
};

function buildTubes(
  view: AeroViewId,
  axis: Axis,
  dirSign: number,
  halfLen: number,
  topY: number,
  topAt: (a: number) => number,
): TubeDef[] {
  const v = (a: number, y: number): THREE.Vector3 => {
    const along = dirSign * a;
    return axis === "x"
      ? new THREE.Vector3(along, y, 0)
      : new THREE.Vector3(0, y, along);
  };
  const ext = halfLen + 1.5;
  const N = 100;
  const defs: TubeDef[] = [];

  // smooth streamline that rides over the measured body silhouette
  const overLine = (h: number, gap: number, color: string, base: number, fade: number) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j < N; j++) {
      const a = lerp(-ext, ext, j / (N - 1));
      pts.push(v(a, smax(h, topAt(a) + gap, 0.06)));
    }
    defs.push({ points: pts, color, base, fade, reps: 2.4, radius: 0.016 });
  };

  // underbody streamline: compresses under the floor, small wheel disturbance
  const underLine = (y0: number, base: number) => {
    const wheelF = -halfLen * 0.5;
    const wheelR = halfLen * 0.55;
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j < N; j++) {
      const a = lerp(-ext, ext, j / (N - 1));
      let y = y0;
      // compression under the car (lower between axles)
      y -= smoothstep(-halfLen, 0, a) * (1 - smoothstep(0, halfLen, a)) * 0.02;
      // wheel-area disturbance
      y += Math.exp(-((a - wheelF) ** 2) / 0.02) * 0.05;
      y += Math.exp(-((a - wheelR) ** 2) / 0.02) * 0.05;
      // diffuser upsweep at the rear
      y += smoothstep(halfLen * 0.4, halfLen * 1.1, a) * 0.22;
      pts.push(v(a, Math.max(0.02, y)));
    }
    defs.push({ points: pts, color: C_UNDER, base, fade: 0.96, reps: 3, radius: 0.015 });
  };

  const external = (count: number, fade: number) => {
    for (let i = 0; i < count; i++) {
      overLine((0.32 + i * 0.34) * topY, 0.05 + i * 0.05, C_EXTERNAL, 0.9, fade);
    }
  };
  const underbody = (count: number) => {
    for (let i = 0; i < count; i++) underLine((0.05 + i * 0.05) * topY, 0.9);
  };

  if (view === "external") {
    external(6, 0.95);
  } else if (view === "underbody") {
    underbody(4);
    overLine(0.9 * topY, 0.05, C_FAINT, 0.3, 0.95);
    overLine(1.4 * topY, 0.05, C_FAINT, 0.3, 0.95);
  } else if (view === "cooling") {
    overLine(0.9 * topY, 0.05, C_FAINT, 0.28, 0.95);
    overLine(1.4 * topY, 0.05, C_FAINT, 0.28, 0.95);
  } else if (view === "wake") {
    external(5, 0.55); // dissolve into the wake
  } else {
    // all
    external(4, 0.9);
    underbody(2);
  }

  return defs;
}

function buildCoolingCurves(
  axis: Axis,
  dirSign: number,
  halfLen: number,
  topY: number,
  topAt: (a: number) => number,
): THREE.CatmullRomCurve3[] {
  const v = (a: number, y: number): THREE.Vector3 => {
    const along = dirSign * a;
    return axis === "x"
      ? new THREE.Vector3(along, y, 0)
      : new THREE.Vector3(0, y, along);
  };
  const ext = halfLen + 1.4;
  return [
    new THREE.CatmullRomCurve3(
      [
        v(-ext, 0.42 * topY),
        v(-halfLen, 0.36 * topY),
        v(-halfLen * 0.4, 0.6 * topY),
        v(0, topAt(0) + 0.05),
        v(halfLen * 0.6, topAt(halfLen * 0.6) + 0.08),
        v(ext, 0.7 * topY),
      ],
      false,
      "catmullrom",
      0.5,
    ),
    new THREE.CatmullRomCurve3(
      [
        v(-ext, 0.3 * topY),
        v(-halfLen, 0.26 * topY),
        v(-halfLen * 0.4, 0.16 * topY),
        v(0, 0.14 * topY),
        v(ext, 0.12 * topY),
      ],
      false,
      "catmullrom",
      0.5,
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Flowing streamlines (faint guide line + traveling dot particles)     */
/* ------------------------------------------------------------------ */

const PER_LINE = 22;

function FlowLines({ defs, flowSpeed }: { defs: TubeDef[]; flowSpeed: number }) {
  const geos = useRef<(THREE.BufferGeometry | null)[]>([]);
  const arrays = useMemo(
    () => defs.map(() => new Float32Array(PER_LINE * 3)),
    [defs],
  );
  const curves = useMemo(
    () =>
      defs.map(
        (d) => new THREE.CatmullRomCurve3(d.points, false, "catmullrom", 0.5),
      ),
    [defs],
  );
  const guides = useMemo(
    () => curves.map((c) => c.getPoints(60)),
    [curves],
  );
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * flowSpeed * 0.16;
    curves.forEach((curve, li) => {
      const geo = geos.current[li];
      const arr = arrays[li];
      if (!geo) return;
      for (let j = 0; j < PER_LINE; j++) {
        let u = (t.current + j / PER_LINE) % 1;
        if (u < 0) u += 1;
        const p = curve.getPoint(u);
        arr[j * 3] = p.x;
        arr[j * 3 + 1] = p.y;
        arr[j * 3 + 2] = p.z;
      }
      const attr = geo.getAttribute("position") as THREE.BufferAttribute;
      attr.needsUpdate = true;
    });
  });

  return (
    <group>
      {defs.map((d, li) => (
        <group key={li}>
          {/* faint guide path */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(guides[li].flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={d.color} transparent opacity={0.18 * d.base} />
          </line>
          {/* travelling particles */}
          <points>
            <bufferGeometry
              ref={(el) => {
                geos.current[li] = (el as THREE.BufferGeometry) ?? null;
              }}
            >
              <bufferAttribute
                attach="attributes-position"
                args={[arrays[li], 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.07}
              color={d.color}
              sizeAttenuation
              transparent
              opacity={0.95 * d.base}
              depthWrite={false}
            />
          </points>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Point shader (cooling + wake particle systems)                      */
/* ------------------------------------------------------------------ */

const POINT_VERT = `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uScale;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;
const POINT_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float edge = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`;

/* ------------------------------------------------------------------ */
/* Cooling particles — orange stream entering grille → through → out    */
/* ------------------------------------------------------------------ */

const COOLING_PER_CURVE = 60;

function CoolingParticles({
  curves,
  flowSpeed,
}: {
  curves: THREE.CatmullRomCurve3[];
  flowSpeed: number;
}) {
  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  const t = useRef(0);
  const count = curves.length * COOLING_PER_CURVE;
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  const { positions, colors, sizes, alphas } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const alp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      siz[i] = 0.05 + rnd(i, 7) * 0.03;
      alp[i] = 0.9;
    }
    return { positions: pos, colors: col, sizes: siz, alphas: alp };
  }, [count]);

  const uniforms = useMemo(() => ({ uScale: { value: 300 } }), []);

  useFrame((_, delta) => {
    t.current += delta * (0.15 + flowSpeed * 0.18);
    const geo = geoRef.current;
    if (!geo) return;
    let vi = 0;
    for (let ci = 0; ci < curves.length; ci++) {
      const curve = curves[ci];
      for (let j = 0; j < COOLING_PER_CURVE; j++) {
        let u = t.current + j / COOLING_PER_CURVE;
        u -= Math.floor(u);
        curve.getPoint(u, tmp);
        positions[vi * 3] = tmp.x;
        positions[vi * 3 + 1] = tmp.y;
        positions[vi * 3 + 2] = tmp.z;
        tmpC.copy(C_COOL_HOT).lerp(C_COOL_COOL, u); // cools as it travels
        colors[vi * 3] = tmpC.r;
        colors[vi * 3 + 1] = tmpC.g;
        colors[vi * 3 + 2] = tmpC.b;
        vi++;
      }
    }
    (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry
        ref={(el) => {
          geoRef.current = (el as THREE.BufferGeometry) ?? null;
        }}
      >
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={POINT_VERT}
        fragmentShader={POINT_FRAG}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Wake particles — chaotic, slower, expanding turbulent cloud          */
/* ------------------------------------------------------------------ */

const WAKE_MAX = 900;

function WakeParticles({
  intensity,
  flow,
  axis,
  dirSign,
  halfLen,
  topY,
}: {
  intensity: number;
  flow: Flow;
  axis: Axis;
  dirSign: number;
  halfLen: number;
  topY: number;
}) {
  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  const t = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  const aStart = halfLen - 0.15;
  const centerY = topY * 0.55;
  const spreadY = topY * 0.9;

  // Pre-allocate the maximum; vary the active count via draw range.
  const { positions, colors, sizes, alphas, seeds } = useMemo(() => {
    const pos = new Float32Array(WAKE_MAX * 3);
    const col = new Float32Array(WAKE_MAX * 3);
    const siz = new Float32Array(WAKE_MAX);
    const alp = new Float32Array(WAKE_MAX);
    const sd = new Float32Array(WAKE_MAX * 4);
    for (let i = 0; i < WAKE_MAX; i++) {
      sd[i * 4] = rnd(i, 1);
      sd[i * 4 + 1] = rnd(i, 2);
      sd[i * 4 + 2] = rnd(i, 3);
      sd[i * 4 + 3] = centerY + (rnd(i, 4) - 0.5) * spreadY;
      siz[i] = 0.025 + rnd(i, 5) * 0.04;
    }
    return { positions: pos, colors: col, sizes: siz, alphas: alp, seeds: sd };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerY, spreadY]);

  const uniforms = useMemo(() => ({ uScale: { value: 300 } }), []);

  useFrame((_, delta) => {
    t.current += delta;
    const geo = geoRef.current;
    if (!geo) return;

    const active = Math.max(0, Math.round(lerp(140, WAKE_MAX, flow.norm) * intensity));
    const time = t.current;
    const turb = flow.turb;
    // wake length grows with speed; particles are slower than freestream
    const aEnd = halfLen + lerp(0.8, 2.6, flow.norm);
    const drift = 0.07 + flow.flowSpeed * 0.06;

    for (let i = 0; i < active; i++) {
      const s0 = seeds[i * 4];
      const s1 = seeds[i * 4 + 1];
      const s2 = seeds[i * 4 + 2];
      const baseY = seeds[i * 4 + 3];

      let prog = s0 + time * drift * (0.5 + 0.7 * s1);
      prog -= Math.floor(prog);
      const a = lerp(aStart, aEnd, prog);

      // dispersion EXPANDS downstream and with turbulence
      const chaos = turb * (0.2 + prog * 1.2);
      const ph = time * 1.7 + s2 * 6.283;
      const r = (0.1 + prog * 0.7) * chaos;
      const offY = Math.sin(ph) * r + Math.sin(time * 2.9 + s1 * 9) * 0.12 * chaos;
      const offA = Math.cos(ph) * r * 0.7 + Math.cos(time * 2.3 + s0 * 7) * 0.1 * chaos;

      const along = dirSign * (a + offA);
      const y = Math.max(0.03, baseY + offY);
      const latJ = (rnd(i, 6) - 0.5) * 0.12 * (0.4 + prog);
      if (axis === "x") tmp.set(along, y, latJ);
      else tmp.set(latJ, y, along);

      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      tmpC.copy(C_WAKE_HOT).lerp(C_WAKE_DEEP, prog * (0.6 + 0.4 * s1));
      colors[i * 3] = tmpC.r;
      colors[i * 3 + 1] = tmpC.g;
      colors[i * 3 + 2] = tmpC.b;

      alphas[i] =
        smoothstep(0, 0.05, prog) * (1 - smoothstep(0.85, 1, prog)) * (0.35 + 0.55 * s1);
    }

    geo.setDrawRange(0, active);
    (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
  });

  if (intensity <= 0) return null;

  return (
    <points>
      <bufferGeometry
        ref={(el) => {
          geoRef.current = (el as THREE.BufferGeometry) ?? null;
        }}
      >
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={POINT_VERT}
        fragmentShader={POINT_FRAG}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Side-locked camera + the car + airflow                              */
/* ------------------------------------------------------------------ */

function AeroContent({
  modelPath,
  lengthM,
  view,
  flow,
}: {
  modelPath: string;
  lengthM: number;
  view: AeroViewId;
  flow: Flow;
}) {
  const { scene } = useGLTF(modelPath);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const setDerivedFrontalArea = useDashboard((s) => s.setDerivedFrontalArea);

  const [sil, setSil] = useState<Silhouette | null>(null);

  const { axis, dirSign, halfLen, topY, latHalf, target } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = NORMALIZED_MAX / maxDim;
    const ax: Axis = size.x >= size.z ? "x" : "z";
    const len = (ax === "x" ? size.x : size.z) * scale;
    const lat = (ax === "x" ? size.z : size.x) * scale;
    const sign = ax === "x" ? 1 : -1;
    return {
      axis: ax,
      dirSign: sign,
      halfLen: len / 2,
      topY: size.y * scale,
      latHalf: lat / 2,
      target: new THREE.Vector3(0, size.y * scale * 0.45, 0),
    };
  }, [scene]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = width / Math.max(height, 1);
    const dist = aspect < 0.9 ? 7.4 : aspect < 1.4 ? 6.2 : 5.4;
    cam.fov = aspect < 0.9 ? 42 : 34;
    const eye = topY * 0.55;
    if (axis === "x") cam.position.set(0, eye, dist);
    else cam.position.set(dist, eye, 0);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, width, height, axis, topY, target]);

  // Measure mesh: top silhouette (body-hugging) + projected frontal area.
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      scene.updateWorldMatrix(true, true);
      const ray = new THREE.Raycaster();
      const o = new THREE.Vector3();

      const S = 72;
      const aLo = -halfLen * 1.12;
      const aHi = halfLen * 1.12;
      const samples = new Float32Array(S);
      const down = new THREE.Vector3(0, -1, 0);
      for (let i = 0; i < S; i++) {
        const aC = lerp(aLo, aHi, i / (S - 1));
        const w = dirSign * aC;
        if (axis === "x") o.set(w, topY * 3 + 2, 0);
        else o.set(0, topY * 3 + 2, w);
        ray.set(o, down);
        const hits = ray.intersectObject(scene, true);
        samples[i] = hits.length ? hits[0].point.y : 0;
      }

      const GX = 26;
      const GY = 16;
      const alongDir =
        axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
      const start = -(halfLen + 1.0);
      let hitN = 0;
      let total = 0;
      for (let gx = 0; gx < GX; gx++) {
        const lat = lerp(-latHalf, latHalf, (gx + 0.5) / GX);
        for (let gy = 0; gy < GY; gy++) {
          const y = lerp(0.01, topY * 1.02, (gy + 0.5) / GY);
          if (axis === "x") o.set(start, y, lat);
          else o.set(lat, y, start);
          ray.set(o, alongDir);
          ray.far = halfLen * 2 + 2.5;
          total++;
          if (ray.intersectObject(scene, true).length) hitN++;
        }
      }
      const occ = total ? hitN / total : 0;
      const mpu = lengthM > 0 ? lengthM / NORMALIZED_MAX : 1;
      const area = occ * (latHalf * 2 * mpu) * (topY * mpu);

      if (!cancelled) {
        setSil({ samples, aLo, aHi });
        setDerivedFrontalArea(area > 0 ? Number(area.toFixed(2)) : null);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [scene, axis, dirSign, halfLen, topY, latHalf, lengthM, setDerivedFrontalArea]);

  useEffect(() => () => setDerivedFrontalArea(null), [setDerivedFrontalArea]);

  const topAt = useMemo(() => {
    return (aC: number): number => {
      if (!sil) return 0;
      const { samples, aLo, aHi } = sil;
      if (aC <= aLo || aC >= aHi) return 0;
      const f = (aC - aLo) / (aHi - aLo);
      const idx = f * (samples.length - 1);
      const i0 = Math.floor(idx);
      const i1 = Math.min(samples.length - 1, i0 + 1);
      return lerp(samples[i0], samples[i1], idx - i0);
    };
  }, [sil]);

  const tubes = useMemo(
    () => (sil ? buildTubes(view, axis, dirSign, halfLen, topY, topAt) : []),
    [sil, view, axis, dirSign, halfLen, topY, topAt],
  );
  const coolingCurves = useMemo(
    () =>
      sil && (view === "cooling" || view === "all")
        ? buildCoolingCurves(axis, dirSign, halfLen, topY, topAt)
        : [],
    [sil, view, axis, dirSign, halfLen, topY, topAt],
  );
  const wakeIntensity = view === "wake" ? 1 : view === "all" ? 0.7 : 0;

  return (
    <>
      <CarModel modelPath={modelPath} />
      {tubes.length > 0 && <FlowLines defs={tubes} flowSpeed={flow.flowSpeed} />}
      {coolingCurves.length > 0 && (
        <CoolingParticles curves={coolingCurves} flowSpeed={flow.flowSpeed} />
      )}
      {sil && wakeIntensity > 0 && (
        <WakeParticles
          intensity={wakeIntensity}
          flow={flow}
          axis={axis}
          dirSign={dirSign}
          halfLen={halfLen}
          topY={topY}
        />
      )}
      <OrbitControls
        makeDefault
        enableRotate={false}
        enablePan={false}
        enableZoom
        zoomSpeed={0.9}
        minDistance={3.5}
        maxDistance={11}
        target={target}
      />
    </>
  );
}

function Fallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <span className="tele-label">Loading model</span>
      </div>
    </Html>
  );
}

export default function AeroScene({
  view,
  scenario,
}: {
  view: AeroViewId;
  scenario: AeroScenario;
}) {
  const car = useCurrentCar();

  // Derive visualization parameters from the scenario speed.
  const flow: Flow = useMemo(() => {
    const norm = Math.min(1, Math.max(0, scenario.speedKmh / 250));
    let turb = 0.15 + norm * 0.6;
    if (scenario.yaw) turb += 0.15;
    if (scenario.wet) turb += 0.08;
    return {
      norm,
      flowSpeed: 0.25 + norm * 1.75,
      turb: Math.min(1, turb),
    };
  }, [scenario.speedKmh, scenario.yaw, scenario.wet]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1, 5.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      resize={{ debounce: 50 }}
    >
      <Suspense fallback={<Fallback />}>
        <AeroContent
          modelPath={car.modelPath}
          lengthM={car.aero.lengthM}
          view={view}
          flow={flow}
        />
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 4, 0]} scale={[8, 8, 1]} form="rect" />
          <Lightformer intensity={1.2} position={[-5, 2, 4]} scale={[4, 6, 1]} form="rect" />
          <Lightformer intensity={1.2} position={[5, 2, 4]} scale={[4, 6, 1]} form="rect" />
        </Environment>
      </Suspense>

      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        position={[4, 9, 6]}
        intensity={1.2}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      >
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.1, 30]} />
      </directionalLight>

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.5}
        scale={14}
        blur={2.6}
        far={5}
        resolution={1024}
        color="#1a1d24"
      />
    </Canvas>
  );
}
