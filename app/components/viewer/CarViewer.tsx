"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Environment,
  Lightformer,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import CarModel from "./CarModel";
import { useDashboard } from "@/lib/store";
import { getCar } from "@/lib/cars";

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

/**
 * Keeps the car well-framed across screen sizes by adapting the camera
 * field-of-view and distance to the canvas aspect ratio. Runs whenever the
 * container resizes, so the model stays responsive to its container.
 */
function ResponsiveCamera() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = width / Math.max(height, 1);

    // Narrow / portrait viewports need a wider FOV and a pulled-back camera
    // so the whole car remains visible.
    const fov = aspect < 0.9 ? 50 : aspect < 1.4 ? 42 : 35;
    const dist = aspect < 0.9 ? 1.5 : aspect < 1.4 ? 1.2 : 1;

    cam.fov = fov;
    cam.position.set(4.8 * dist, 1.7 * dist, 5.6 * dist);
    cam.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}

export default function CarViewer() {
  const carId = useDashboard((s) => s.carId);
  const car = getCar(carId);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4.8, 1.7, 5.6], fov: 35 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      resize={{ debounce: 50 }}
    >
      <ResponsiveCamera />

      <Suspense fallback={<Fallback />}>
        <CarModel modelPath={car.modelPath} />
        {/* Local studio environment for metallic reflections — no network fetch */}
        <Environment resolution={256}>
          <Lightformer
            intensity={2}
            position={[0, 4, 0]}
            scale={[8, 8, 1]}
            form="rect"
          />
          <Lightformer
            intensity={1.2}
            position={[-5, 2, 2]}
            scale={[4, 6, 1]}
            form="rect"
          />
          <Lightformer
            intensity={1.2}
            position={[5, 2, 2]}
            scale={[4, 6, 1]}
            form="rect"
          />
          <Lightformer
            intensity={0.8}
            position={[0, 1, -6]}
            scale={[8, 4, 1]}
            form="rect"
          />
        </Environment>
      </Suspense>

      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[6, 9, 5]}
        intensity={1.3}
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

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        zoomSpeed={0.9}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={12}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.7, 0]}
      />
    </Canvas>
  );
}
