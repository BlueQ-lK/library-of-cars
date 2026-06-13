"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
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

type FlowLine = {
  curve: THREE.CatmullRomCurve3;
  color: string;
  /** relative travel speed of particles on this line */
  speed: number;
  /** points to draw the faint guide line */
  guide: THREE.Vector3[];
};

/* ------------------------------------------------------------------ */
/* Build 3D streamlines in the side plane of the car                   */
/* ------------------------------------------------------------------ */

function buildLines(
  view: AeroViewId,
  axis: Axis,
  dirSign: number,
  halfLen: number,
  topY: number,
): FlowLine[] {
  // Canonical along-axis coordinate `a`: -ext = FRONT of the car (screen-left,
  // where the relative wind arrives), +ext = REAR (screen-right, the wake side).
  // `dirSign` maps this canonical coordinate onto the correct WORLD direction so
  // that, for the active side camera, the front sits on screen-left and air
  // physically flows front → rear (left → right). Particles travel a:-ext → +ext.
  const v = (a: number, y: number, lateral = 0): THREE.Vector3 => {
    const along = dirSign * a;
    return axis === "x"
      ? new THREE.Vector3(along, y, lateral)
      : new THREE.Vector3(lateral, y, along);
  };

  const ext = halfLen + 1.2;
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

  if (view === "external") {
    const bases = [0.32, 0.62, 0.95, 1.3, 1.7];
    bases.forEach((f) => {
      const yBase = f * topY;
      const peak = Math.max(yBase + 0.06, topY * 1.02 + 0.12);
      make(
        [
          v(-ext, yBase),
          v(-halfLen * 0.75, yBase + (peak - yBase) * 0.45),
          v(0, peak),
          v(halfLen * 0.8, yBase + (peak - yBase) * 0.45),
          v(ext, yBase),
        ],
        COLORS.air,
        1,
      );
    });
  } else if (view === "underbody") {
    const bases = [0.05, 0.12, 0.2];
    bases.forEach((f) => {
      const y = f * topY + 0.02;
      make(
        [
          v(-ext, y),
          v(-halfLen, y),
          v(halfLen * 0.7, y),
          v(halfLen + 0.3, y + 0.28),
          v(ext, y + 0.4),
        ],
        COLORS.underbody,
        1.6,
      );
    });
    // reference flow over the body
    make(
      [v(-ext, topY * 1.2), v(0, topY * 1.25), v(ext, topY * 1.2)],
      COLORS.cool,
      0.9,
    );
  } else if (view === "cooling") {
    // air drawn into the grille, through the radiator, exits over the hood
    make(
      [
        v(-ext, 0.42 * topY),
        v(-halfLen, 0.38 * topY),
        v(-halfLen * 0.35, 0.62 * topY),
        v(0, 0.98 * topY),
        v(halfLen * 0.6, topY * 1.05),
        v(ext, topY * 1.0),
      ],
      COLORS.cooling,
      1.1,
    );
    // lower cooling path exiting behind the front wheel
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
    // clean over-body reference
    make(
      [v(-ext, topY * 1.45), v(0, topY * 1.5), v(ext, topY * 1.45)],
      COLORS.cool,
      0.8,
    );
  } else {
    // wake — flow detaches at the rear and recirculates
    const bases = [0.45, 0.85, 1.25];
    bases.forEach((f, i) => {
      const yBase = f * topY;
      const peak = Math.max(yBase + 0.06, topY * 1.02 + 0.12);
      make(
        [
          v(-ext, yBase),
          v(-halfLen * 0.75, yBase + (peak - yBase) * 0.45),
          v(0, peak),
          v(halfLen * 0.85, peak - 0.05),
          v(halfLen + 0.3, yBase - 0.1 - i * 0.05),
          v(ext, yBase - 0.25),
        ],
        COLORS.air,
        1,
      );
    });
    // recirculation swirls behind the car
    const swirl = (cx: number, cy: number, r: number, sp: number) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        pts.push(v(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      make(pts, COLORS.wake, sp, true);
    };
    swirl(halfLen + 0.55, topY * 0.62, 0.34, 1.4);
    swirl(halfLen + 0.8, topY * 0.32, 0.24, 1.7);
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
          {/* faint guide path */}
          <Line
            points={line.guide}
            color={line.color}
            lineWidth={1}
            transparent
            opacity={0.18}
            dashed={false}
          />
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
  view,
  scenario,
}: {
  modelPath: string;
  view: AeroViewId;
  scenario: AeroScenario;
}) {
  const { scene } = useGLTF(modelPath);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  const { axis, dirSign, halfLen, topY, target } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = NORMALIZED_MAX / maxDim;
    const ax: Axis = size.x >= size.z ? "x" : "z";
    const len = (ax === "x" ? size.x : size.z) * scale;
    // The side camera sits on +Z (length=x) or +X (length=z). Its screen-right
    // is +X or -Z respectively, so the world direction from the front
    // (screen-left) toward the rear (screen-right / wake) is +1 / -1.
    const sign = ax === "x" ? 1 : -1;
    return {
      axis: ax,
      dirSign: sign,
      halfLen: len / 2,
      topY: size.y * scale,
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

  const lines = useMemo(
    () => buildLines(view, axis, dirSign, halfLen, topY),
    [view, axis, dirSign, halfLen, topY],
  );

  return (
    <>
      <CarModel modelPath={modelPath} />
      <Airflow lines={lines} sc={scenario} />
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
