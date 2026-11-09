"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html, Grid } from "@react-three/drei";
import * as THREE from "three";
import { CameraPreset, MeshTelemetry, SliceAxis } from "@/types/patient";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface BrainSceneProps {
  modelUrl: string;
  cortexOpacity: number;
  showCortex: boolean;
  showHotspot: boolean;
  wireframe: boolean;
  pulseHotspot: boolean;
  hotspotGlow: number;
  autoRotate: boolean;
  showLabels: boolean;
  showGrid: boolean;
  cameraPreset: CameraPreset;
  sliceAxis: SliceAxis;
  slicePosition: number;
  cortexColor: string;
  hotspotColor: string;
  onTelemetryComputed: (telemetry: MeshTelemetry) => void;
}

interface InternalModelProps extends BrainSceneProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

function CameraRig({
  cameraPreset,
  hotspotLocalCenter,
  controlsRef,
}: {
  cameraPreset: CameraPreset;
  hotspotLocalCenter: THREE.Vector3;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const dist = 0.26;
    const target = new THREE.Vector3(0, 0, 0);
    const pos = new THREE.Vector3(0, 0.06, dist);

    switch (cameraPreset) {
      case "superior":
        pos.set(0, dist, 0.001);
        break;
      case "anterior":
        pos.set(0, 0, dist);
        break;
      case "posterior":
        pos.set(0, 0, -dist);
        break;
      case "left_lateral":
        pos.set(-dist, 0.02, 0);
        break;
      case "right_lateral":
        pos.set(dist, 0.02, 0);
        break;
      case "hotspot_focus":
        target.copy(hotspotLocalCenter);
        pos.copy(hotspotLocalCenter).add(
          new THREE.Vector3(
            hotspotLocalCenter.x <= 0 ? -0.11 : 0.11,
            0.05,
            0.11
          )
        );
        break;
      default:
        pos.set(-0.16, 0.1, 0.21);
        break;
    }

    camera.position.copy(pos);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [cameraPreset, hotspotLocalCenter, camera, controlsRef]);

  return null;
}

function BrainMeshGroup({
  modelUrl,
  cortexOpacity,
  showCortex,
  showHotspot,
  wireframe,
  pulseHotspot,
  hotspotGlow,
  showLabels,
  sliceAxis,
  slicePosition,
  cortexColor,
  hotspotColor,
  cameraPreset,
  controlsRef,
  onTelemetryComputed,
}: InternalModelProps) {
  const { scene } = useGLTF(modelUrl);
  const hotspotMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const [sceneOffset, setSceneOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [hotspotPinPos, setHotspotPinPos] = useState<THREE.Vector3>(
    new THREE.Vector3(-0.04, 0.015, 0)
  );
  const [maxHalfExtent, setMaxHalfExtent] = useState<number>(0.09);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1), []);

  useEffect(() => {
    if (sliceAxis === "none") {
      clippingPlane.constant = 10;
    } else {
      const normal =
        sliceAxis === "x"
          ? new THREE.Vector3(-1, 0, 0)
          : sliceAxis === "y"
          ? new THREE.Vector3(0, -1, 0)
          : new THREE.Vector3(0, 0, -1);
      clippingPlane.normal.copy(normal);
      clippingPlane.constant = slicePosition * maxHalfExtent;
    }
  }, [sliceAxis, slicePosition, maxHalfExtent, clippingPlane]);

  useEffect(() => {
    let cortexVerts = 0;
    let cortexTris = 0;
    let hotspotVerts = 0;
    let hotspotTris = 0;

    const cortexBox = new THREE.Box3();
    const hotspotBox = new THREE.Box3();

    clonedScene.updateMatrixWorld(true);

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;

        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }
        geom.computeBoundingBox();

        const vCount = geom.attributes.position ? geom.attributes.position.count : 0;
        const iCount = geom.index ? geom.index.count / 3 : vCount / 3;

        const isHotspot =
          mesh.name.includes("Hotspot") ||
          mesh.parent?.name.includes("Hotspot") ||
          (mesh.material as THREE.Material)?.name?.includes("Epileptogenic");

        const worldBox = geom.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);

        if (isHotspot) {
          hotspotVerts += vCount;
          hotspotTris += Math.round(iCount);
          hotspotBox.union(worldBox);
        } else {
          cortexVerts += vCount;
          cortexTris += Math.round(iCount);
          cortexBox.union(worldBox);
        }
      }
    });

    const overallCenter = new THREE.Vector3();
    if (!cortexBox.isEmpty()) {
      cortexBox.getCenter(overallCenter);
    }

    const cortexSize = new THREE.Vector3();
    cortexBox.getSize(cortexSize);

    const hotspotSize = new THREE.Vector3();
    const hotspotCenter = new THREE.Vector3();
    if (!hotspotBox.isEmpty()) {
      hotspotBox.getSize(hotspotSize);
      hotspotBox.getCenter(hotspotCenter);
    }

    setSceneOffset(overallCenter.clone().negate());
    const localHotspot = hotspotCenter.clone().sub(overallCenter);
    setHotspotPinPos(localHotspot);

    const halfMax = Math.max(cortexSize.x, cortexSize.y, cortexSize.z) * 0.55;
    if (halfMax > 0) setMaxHalfExtent(halfMax);

    const hotspotVolCm3 =
      (4 / 3) *
      Math.PI *
      (hotspotSize.x / 2) *
      (hotspotSize.y / 2) *
      (hotspotSize.z / 2) *
      0.68 *
      1_000_000;

    const cortexVolCm3 =
      (4 / 3) *
      Math.PI *
      (cortexSize.x / 2) *
      (cortexSize.y / 2) *
      (cortexSize.z / 2) *
      0.68 *
      1_000_000;

    const ratioPercent =
      cortexVolCm3 > 0 ? Math.min(100, (hotspotVolCm3 / cortexVolCm3) * 100) : 0;

    const detectedHemisphere =
      Math.abs(localHotspot.x) < 0.008
        ? "Midline / Bilateral"
        : localHotspot.x < 0
        ? "Left Hemisphere"
        : "Right Hemisphere";

    const antPost =
      localHotspot.z > 0.015
        ? "Fronto-Anterior"
        : localHotspot.z < -0.015
        ? "Parieto-Occipital"
        : "Central / Temporal";

    const supInf =
      localHotspot.y > 0.01
        ? "Superior"
        : localHotspot.y < -0.01
        ? "Inferior / Basal"
        : "Lateral";

    const detectedAnatomicalRegion = `${supInf} ${antPost} Cortex`;

    onTelemetryComputed({
      cortexVertices: cortexVerts,
      cortexTriangles: cortexTris,
      hotspotVertices: hotspotVerts,
      hotspotTriangles: hotspotTris,
      brainDimensionsMm: [
        +(cortexSize.x * 1000).toFixed(1),
        +(cortexSize.y * 1000).toFixed(1),
        +(cortexSize.z * 1000).toFixed(1),
      ],
      hotspotDimensionsMm: [
        +(hotspotSize.x * 1000).toFixed(1),
        +(hotspotSize.y * 1000).toFixed(1),
        +(hotspotSize.z * 1000).toFixed(1),
      ],
      hotspotCentroidMm: [
        +(localHotspot.x * 1000).toFixed(1),
        +(localHotspot.y * 1000).toFixed(1),
        +(localHotspot.z * 1000).toFixed(1),
      ],
      estimatedHotspotVolumeCm3: +hotspotVolCm3.toFixed(2),
      hotspotVolumeRatioPercent: +ratioPercent.toFixed(1),
      detectedHemisphere,
      detectedAnatomicalRegion,
    });
  }, [clonedScene, onTelemetryComputed]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const isHotspot =
          mesh.name.includes("Hotspot") ||
          mesh.parent?.name.includes("Hotspot") ||
          (mesh.material as THREE.Material)?.name?.includes("Epileptogenic");

        if (isHotspot) {
          mesh.visible = showHotspot;
          mesh.renderOrder = 2;
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(hotspotColor),
            emissive: new THREE.Color(hotspotColor),
            emissiveIntensity: hotspotGlow,
            roughness: 0.18,
            metalness: 0.1,
            transparent: true,
            opacity: 0.94,
            depthWrite: true,
            side: THREE.DoubleSide,
          });
          hotspotMatRef.current = mat;
          mesh.material = mat;
        } else {
          mesh.visible = showCortex;
          mesh.renderOrder = 1;
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(cortexColor),
            roughness: 0.25,
            metalness: 0.05,
            clearcoat: 0.4,
            clearcoatRoughness: 0.2,
            transparent: true,
            opacity: cortexOpacity,
            wireframe: wireframe,
            depthWrite: false,
            side: THREE.DoubleSide,
            clippingPlanes: sliceAxis === "none" ? [] : [clippingPlane],
            clipShadows: true,
          });
        }
      }
    });
  }, [
    clonedScene,
    cortexOpacity,
    showCortex,
    showHotspot,
    wireframe,
    hotspotGlow,
    cortexColor,
    hotspotColor,
    sliceAxis,
    clippingPlane,
  ]);

  useFrame(({ clock }) => {
    if (hotspotMatRef.current) {
      if (pulseHotspot) {
        const wave = Math.sin(clock.getElapsedTime() * 3.2) * 0.5 + 0.5;
        hotspotMatRef.current.emissiveIntensity = hotspotGlow * (0.65 + wave * 0.85);
      } else {
        hotspotMatRef.current.emissiveIntensity = hotspotGlow;
      }
    }
  });

  return (
    <>
      <CameraRig
        cameraPreset={cameraPreset}
        hotspotLocalCenter={hotspotPinPos}
        controlsRef={controlsRef}
      />

      <group position={sceneOffset}>
        <primitive object={clonedScene} />
      </group>

      {showHotspot && (
        <pointLight
          position={hotspotPinPos}
          color={hotspotColor}
          intensity={hotspotGlow * 0.25}
          distance={0.18}
        />
      )}

      {showLabels && showHotspot && (
        <Html position={hotspotPinPos} center distanceFactor={0.35} zIndexRange={[20, 0]}>
          <div className="pointer-events-none select-none flex items-center gap-2 bg-slate-950/90 border border-cyan-400/80 text-cyan-200 px-2.5 py-1 rounded-full shadow-[0_0_20px_rgba(0,224,255,0.45)] backdrop-blur-md whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-semibold tracking-wide">
              Predicted Seizure Zone
            </span>
          </div>
        </Html>
      )}
    </>
  );
}

export default function BrainScene(props: BrainSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      camera={{ position: [-0.16, 0.1, 0.21], fov: 42, near: 0.005, far: 10 }}
      gl={{ antialias: true, localClippingEnabled: true, preserveDrawingBuffer: true }}
      className="w-full h-full"
    >
      <color attach="background" args={["#030712"]} />

      <ambientLight intensity={0.75} />
      <directionalLight position={[1.5, 2, 1.5]} intensity={1.6} color="#f8fafc" />
      <directionalLight position={[-1.5, -1, -1]} intensity={0.7} color="#38bdf8" />
      <directionalLight position={[0, 1.5, -2]} intensity={0.5} color="#818cf8" />

      <Suspense
        fallback={
          <Html center>
            <div className="flex flex-col items-center gap-3 bg-slate-900/90 border border-cyan-500/40 px-6 py-4 rounded-2xl shadow-2xl">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs font-mono text-cyan-300 tracking-wider uppercase">
                Loading Patient 3D GLB...
              </div>
            </div>
          </Html>
        }
      >
        <BrainMeshGroup {...props} controlsRef={controlsRef} />
        <Environment preset="city" />
      </Suspense>

      {props.showGrid && (
        <Grid
          position={[0, -0.075, 0]}
          args={[0.4, 0.4]}
          cellSize={0.02}
          cellThickness={0.6}
          cellColor="#1e293b"
          sectionSize={0.1}
          sectionThickness={1.2}
          sectionColor="#0ea5e9"
          fadeDistance={0.45}
          fadeStrength={1}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={props.autoRotate}
        autoRotateSpeed={1.2}
        enableDamping
        dampingFactor={0.06}
        minDistance={0.06}
        maxDistance={0.8}
      />
    </Canvas>
  );
}