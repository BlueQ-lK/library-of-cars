"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Environment,
  Lightformer,
  Line,
  Html,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import CarModel from "./CarModel";
import { useDashboard } from "@/lib/store";
import { getCar } from "@/lib/cars";
import type { AeroViewId, AeroScenario } from "@/lib/cars";

type Axis = "x" | "z";

const NORMALIZED_MAX = 3.2; // CarModel scales the longest dimension to this.

const COLORS = {
  air: "#1f7bff",
  underbody: "#12a150",
  cooling: "#e08a00",
  wake: "#e5484d",
  cool: "#7fb0ff",
};

/** Measured side-profile silhouette of the loaded mesh (in canonical coords). */
type Silhouette = {
  /** top surface height samples (world Y), indexed across [aLo, aHi] */
  samples: Float32Array;
  aLo: number;
  aHi: number;
};

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1)));
  return t * t * (3 - 2 * t);
}

/** Smooth maximum — lets a streamline ride smoothly up and over the body. */
function smax(a: number, b: number, k: number): number {
  return Math.max(a, b) + k * Math.log(1 + Math.exp(-Math.abs(a - b) / k));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

type FlowLine = {
  curve: THREE.CatmullRomCurve3;
  color: string;
  speed: number;
  guide: THREE.Vector3[];
};

/* ------------------------------------------------------------------ */
/* Build streamlines that hug the MEASURED mesh silhouette             */
/* ------------------------------------------------------------------ */

function buildLines(
  view: AeroViewId,
  axis: Axis,
  dirSign: number,
  halfLen: number,
  topY: number,
  topAt: (aCanonical: number) => number,
): FlowLine[] {
  // Canonical along-axis coordinate `a`: -ext = FRONT (screen-left, where the
  // relative wind arrives), +ext = REAR (screen-right / wake). `dirSign` maps it
  // onto the correct world direction so air flows front → rear (left → right).
  const v = (a: number, y: number, lateral = 0): THREE.Vector3 => {
    const along = dirSign * a;
    return axis === "x"
      ? new THREE.Vector3(along, y, lateral)
      : new THREE.Vector3(lateral, y, along);
  };

  const ext = halfLen + 1.2;
  const N = 90;
  const lines: FlowLine[] = [];

  const make = (
    pts: THREE.Vector3[],
    color: string,
    speed: number,
    closed = false,
  ) => {
    const curve = new THREE.CatmullRomCurve3(pts, closed, "catmullrom", 0.5);
    lines.push({ curve, color, speed, guide: curve.getPoints(60) });
  };

  // A streamline at freestream height `h` that rides over the measured body.
  const overLine = (h: number, gap: number) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j < N; j++) {
      const a = lerp(-ext, ext, j / (N - 1));
      const y = smax(h, topAt(a) + gap, 0.06);
      pts.push(v(a, y));
    }
    return pts;
  };

  // Underbody streamline: flat near the ground, rising at the rear (diffuser).
  const underLine = (y0: number, rise: number) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j < N; j++) {
      const a = lerp(-ext, ext, j / (N - 1));
      const diff = smoothstep(halfLen * 0.4, halfLen * 1.1, a);
      pts.push(v(a, y0 + diff * rise));
    }
    return pts;
  };

  // Cooling: air into the grille → through the radiator → out over the body.
  const addCooling = () => {
    make(
      [
        v(-ext, 0.42 * topY),
        v(-halfLen, 0.36 * topY),
        v(-halfLen * 0.4, 0.6 * topY),
        v(0, topAt(0) + 0.06),
        v(halfLen * 0.6, topAt(halfLen * 0.6) + 0.08),
        v(ext, 0.7 * topY),
      ],
      COLORS.cooling,
      1.1,
    );
    make(
      [
        v(-ext, 0.3 * topY),
        v(-halfLen, 0.26 * topY),
        v(-halfLen * 0.4, 0.18 * topY),
        v(0, 0.16 * topY),
        v(ext, 0.14 * topY),
      ],
      COLORS.cooling,
      1.3,
    );
  };

  // Wake: recirculating swirls just behind the measured rear of the body.
  const addWake = () => {
    const swirl = (cx: number, cy: number, r: number, sp: number) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 10; k++) {
        const ang = (k / 10) * Math.PI * 2;
        pts.push(v(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
      }
      make(pts, COLORS.wake, sp, true);
    };
    swirl(halfLen + 0.55, topY * 0.62, 0.34, 1.4);
    swirl(halfLen + 0.85, topY * 0.34, 0.24, 1.7);
  };

  const addExternal = (count: number) => {
    for (let i = 0; i < count; i++) {
      make(overLine((0.32 + i * 0.34) * topY, 0.05 + i * 0.05), COLORS.air, 1);
    }
  };

  const addUnderbody = (count: number) => {
    for (let i = 0; i < count; i++) {
      make(
        underLine((0.05 + i * 0.05) * topY, 0.24 + i * 0.05),
        COLORS.underbody,
        1.6,
      );
    }
  };

  if (view === "external") {
    addExternal(5);
    make(underLine(0.06 * topY, 0.18), COLORS.cool, 1.2);
  } else if (view === "underbody") {
    addUnderbody(4);
    make(overLine(0.5 * topY, 0.05), COLORS.cool, 0.9);
    make(overLine(1.2 * topY, 0.05), COLORS.cool, 0.9);
  } else if (view === "cooling") {
    addCooling();
    make(overLine(1.35 * topY, 0.05), COLORS.cool, 0.8);
  } else if (view === "wake") {
    for (let i = 0; i < 4; i++) {
      make(overLine((0.4 + i * 0.36) * topY, 0.05 + i * 0.05), COLORS.air, 1);
    }
    addWake();
  } else {
    // "all" — every system combined (slightly thinned out to stay readable)
    addExternal(4);
    addUnderbody(2);
    addCooling();
    addWake();
  }

  return lines;
}

/* ------------------------------------------------------------------ */
/* Animated particles travelling along the streamlines                 */
/* ------------------------------------------------------------------ */

const PER_LINE = 22;

function Airflow({ lines, sc }: { lines: FlowLine[]; sc: AeroScenario }) {
  const geos = useRef<(THREE.BufferGeometry | null)[]>([]);
  const arrays = useMemo(
    () => lines.map(() => new Float32Array(PER_LINE * 3)),
    [lines],
  );
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * sc.flowSpeed * 0.16;
    lines.forEach((line, li) => {
      const geo = geos.current[li];
      const arr = arrays[li];
      if (!geo) return;
      for (let j = 0; j < PER_LINE; j++) {
        let u = (t.current * line.speed + j / PER_LINE) % 1;
        if (u < 0) u += 1;
        const p = line.curve.getPoint(u);
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
      {lines.map((line, li) => (
        <group key={li}>
          <Line
            points={line.guide}
            color={line.color}
            lineWidth={1}
            transparent
            opacity={0.18}
            dashed={false}
          />
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
              color={line.color}
              sizeAttenuation
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </points>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Side-locked camera + the car + airflow                              */
/* ------------------------------------------------------------------ */

function AeroContent({
  modelPath,
  lengthM,
  view,
  scenario,
}: {
  modelPath: string;
  lengthM: number;
  view: AeroViewId;
  scenario: AeroScenario;
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

  // Lock to a clean side view; reframe responsively.
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

  // Measure the real mesh: top silhouette (for body-hugging streamlines) and
  // projected frontal area (for the drag equation). Runs once the model is laid
  // out so its world matrices reflect CarModel's normalize/centre/ground.
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      scene.updateWorldMatrix(true, true);
      const ray = new THREE.Raycaster();
      const o = new THREE.Vector3();

      // --- top silhouette: cast rays straight down along the centreline ---
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

      // --- frontal area: occupancy of a grid fired along the length axis ---
      const GX = 26;
      const GY = 16;
      const alongDir =
        axis === "x"
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 0, 1);
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
      // Convert normalized units → metres. The longest dimension (length) was
      // scaled to NORMALIZED_MAX, so metres-per-unit = lengthM / NORMALIZED_MAX.
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

  // Clear the derived value when leaving the aero scene.
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

  const lines = useMemo(
    () =>
      sil ? buildLines(view, axis, dirSign, halfLen, topY, topAt) : [],
    [sil, view, axis, dirSign, halfLen, topY, topAt],
  );

  return (
    <>
      <CarModel modelPath={modelPath} />
      {lines.length > 0 && <Airflow lines={lines} sc={scenario} />}
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
  const carId = useDashboard((s) => s.carId);
  const car = getCar(carId);

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
          scenario={scenario}
        />
        <Environment resolution={256}>
          <Lightformer
            intensity={2}
            position={[0, 4, 0]}
            scale={[8, 8, 1]}
            form="rect"
          />
          <Lightformer
            intensity={1.2}
            position={[-5, 2, 4]}
            scale={[4, 6, 1]}
            form="rect"
          />
          <Lightformer
            intensity={1.2}
            position={[5, 2, 4]}
            scale={[4, 6, 1]}
            form="rect"
          />
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
        <orthographicCamera
          attach="shadow-camera"
          args={[-6, 6, 6, -6, 0.1, 30]}
        />
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
