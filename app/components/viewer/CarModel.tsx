"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useDashboard } from "@/lib/store";

type Props = { modelPath: string };

export default function CarModel({ modelPath }: Props) {
  const { scene } = useGLTF(modelPath);
  const colorHex = useDashboard((s) => s.colorHex);

  // Normalize: center on origin, rest on ground, scale to a consistent size.
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 3.2 / maxDim;

    return {
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s] as [
        number,
        number,
        number,
      ],
    };
  }, [scene]);

  // Enable shadows once.
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  // Recolor the body "paint" material whenever the chosen color changes.
  useEffect(() => {
    const target = new THREE.Color(colorHex);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat && mat.name === "paint") {
          mat.color.copy(target);
          mat.metalness = 0.85;
          mat.roughness = 0.32;
          mat.needsUpdate = true;
        }
      });
    });
  }, [scene, colorHex]);

  return (
    <group scale={scale} position={offset}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/japanese_bus_nagoya_city_bus_aichi.glb");
