"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { PATIENTS } from "@/data/patients";
import {
  CameraPreset,
  MeshTelemetry,
  PatientRecord,
  SliceAxis,
} from "@/types/patient";
import ARModal from "@/components/ARModal";
import {
  Activity,
  Box,
  Brain,
  Camera,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  FolderOpen,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scissors,
  Search,
  Sliders,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react";

// Disable SSR entirely for Three.js canvas to prevent hydration mismatches
const BrainScene = dynamic(() => import("@/components/BrainScene"), {
  ssr: false,
});

const ALL_PATIENT_FOLDERS = [
  "sub-PID02", "sub-PID03", "sub-PID04", "sub-PID07",
  "sub-PID08", "sub-PID12", "sub-PID17", "sub-PID18",
  "sub-PID19", "sub-PID20", "sub-PID21", "sub-PID22",
  "sub-PID25", "sub-PID27"
];

const STATIC_PATIENTS: PatientRecord[] = ALL_PATIENT_FOLDERS.map((folder) => {
  const code = folder.replace("sub-", "");
  return {
    id: folder,
    code,
    name: `Patient ${code}`,
    folderName: folder,
    modelUrl: `/3d_ar_exports/${folder}/${folder}_prediction_ar_model.glb`,
  };
});

export default function EpilepsyNavigationPlatform() {
  const [isMounted, setIsMounted] = useState(false);
  const [patients] = useState<PatientRecord[]>(STATIC_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord>(STATIC_PATIENTS[1]); // Default to sub-PID03
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 3D Visual Controls State
  const [cortexOpacity, setCortexOpacity] = useState<number>(0.22);
  const [showCortex, setShowCortex] = useState<boolean>(true);
  const [showHotspot, setShowHotspot] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [pulseHotspot, setPulseHotspot] = useState<boolean>(true);
  const [hotspotGlow, setHotspotGlow] = useState<number>(1.5);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("default");

  // Surgical Clipping Slicer State
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("none");
  const [slicePosition, setSlicePosition] = useState<number>(0.2);

  // Colors
  const [cortexColor] = useState<string>("#e6ebf7");
  const [hotspotColor, setHotspotColor] = useState<string>("#00e0ff");

  // Presentation & AR Modal
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [isAROpen, setIsAROpen] = useState<boolean>(false);

  // Auto-computed 3D GLB Telemetry
  const [telemetry, setTelemetry] = useState<MeshTelemetry>({
    cortexVertices: 7159,
    cortexTriangles: 14286,
    hotspotVertices: 3348,
    hotspotTriangles: 6684,
    brainDimensionsMm: [131.8, 132.0, 171.4],
    hotspotDimensionsMm: [49.2, 53.3, 83.4],
    hotspotCentroidMm: [-40.5, -4.2, -4.6],
    estimatedHotspotVolumeCm3: 78.4,
    hotspotVolumeRatioPercent: 7.4,
    detectedHemisphere: "Left Hemisphere",
    detectedAnatomicalRegion: "Lateral Central / Temporal Cortex",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleTelemetry = useCallback((data: MeshTelemetry) => {
    setTelemetry(data);
  }, []);

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith(".glb") && !file.name.endsWith(".gltf")) {
      alert("Please select a valid .glb or .gltf 3D model file.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const cleanId = file.name.replace(/\.(glb|gltf)$/i, "");
    const newPatient: PatientRecord = {
      id: `custom-${Date.now()}`,
      code: cleanId.slice(0, 10).toUpperCase(),
      name: `Custom: ${cleanId}`,
      folderName: "Local Upload",
      modelUrl: objectUrl,
    };
    setSelectedPatient(newPatient);
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentIndex = patients.findIndex((p) => p.id === selectedPatient.id);
  const goPrevPatient = () => {
    if (patients.length === 0) return;
    const prevIdx = (currentIndex - 1 + patients.length) % patients.length;
    setSelectedPatient(patients[prevIdx]);
  };
  const goNextPatient = () => {
    if (patients.length === 0) return;
    const nextIdx = (currentIndex + 1) % patients.length;
    setSelectedPatient(patients[nextIdx]);
  };

  if (!isMounted) return null; // Prevents server-client tree mismatch during SSR

  return (
    <div
      className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      }}
    >
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-cyan-950/80 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center">
          <Upload className="w-14 h-14 text-cyan-300 animate-bounce" />
          <h2 className="text-xl font-bold text-white mt-3">
            Drop Patient .GLB File to Visualize Instantly
          </h2>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="h-14 border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-md px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,224,255,0.2)]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">
                NEURONAV 3D
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                14-Patient Cohort Suite
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              3D Cortical Reconstruction & Seizure Onset Zone Localization
            </p>
          </div>
        </div>

        {/* Center Quick-Switcher for Presentation */}
        <div className="hidden md:flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-3 py-1 rounded-full text-xs">
          <button
            onClick={goPrevPatient}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
            title="Previous Patient"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-white">
              {selectedPatient.id}
            </span>
            <span className="text-slate-500">
              ({currentIndex !== -1 ? currentIndex + 1 : 1}/{patients.length})
            </span>
          </div>

          <button
            onClick={goNextPatient}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
            title="Next Patient"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5 pr-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-medium">
              {telemetry.detectedHemisphere}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load .GLB</span>
          </button>

          <button
            onClick={() => setIsAROpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-[0_0_20px_rgba(0,224,255,0.3)] transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>AR View</span>
          </button>

          <button
            onClick={() => setPresentationMode(!presentationMode)}
            title="Toggle Presentation Fullscreen Mode"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            {presentationMode ? (
              <Minimize2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar */}
        {!presentationMode && (
          <aside className="w-80 border-r border-slate-800/90 bg-slate-900/65 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    3d_ar_exports ({patients.length})
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">GLB</span>
                </div>

                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter sub-PID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredPatients.map((patient) => {
                    const active = patient.id === selectedPatient.id;
                    return (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`text-left p-2 rounded-xl border transition-all ${
                          active
                            ? "bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,224,255,0.18)]"
                            : "bg-slate-900/60 border-slate-800/90 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-mono font-bold text-xs flex items-center justify-between">
                          <span>{patient.id}</span>
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {patient.folderName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stereotactic Localization */}
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    3D Stereotactic Localization
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                    {selectedPatient.code}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hemisphere:</span>
                    <span className="font-semibold text-cyan-300">
                      {telemetry.detectedHemisphere}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cortical Zone:</span>
                    <span className="font-medium text-right text-slate-200">
                      {telemetry.detectedAnatomicalRegion}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">EZ Centroid (mm):</span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      [{telemetry.hotspotCentroidMm.join(", ")}]
                    </span>
                  </div>
                </div>
              </div>

              {/* Volumetric Telemetry */}
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Volumetric Telemetry
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {telemetry.hotspotVolumeRatioPercent}% of Cortex
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">EZ Volume</div>
                    <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                      {telemetry.estimatedHotspotVolumeCm3} cm³
                    </div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">EZ Span (mm)</div>
                    <div className="text-xs font-bold font-mono text-white mt-1">
                      {telemetry.hotspotDimensionsMm.join(" × ")}
                    </div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">Cortex Mesh</div>
                    <div className="text-xs font-mono text-slate-200 mt-0.5">
                      {telemetry.cortexVertices.toLocaleString()} verts
                    </div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">Seizure Mesh</div>
                    <div className="text-xs font-mono text-cyan-300 mt-0.5">
                      {telemetry.hotspotVertices.toLocaleString()} verts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: cortexColor, opacity: 0.6 }} />
                  <span className="text-slate-300">Brain_Cortex</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Node 0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shadow-[0_0_10px_#00e0ff]" style={{ backgroundColor: hotspotColor }} />
                  <span className="text-cyan-300 font-medium">Predicted_Hotspot</span>
                </div>
                <span className="font-mono text-[10px] text-cyan-500">Node 1</span>
              </div>
            </div>
          </aside>
        )}

        {/* Center 3D Viewport */}
        <main className="flex-1 relative bg-slate-950">
          <BrainScene
            modelUrl={selectedPatient.modelUrl}
            cortexOpacity={cortexOpacity}
            showCortex={showCortex}
            showHotspot={showHotspot}
            wireframe={wireframe}
            pulseHotspot={pulseHotspot}
            hotspotGlow={hotspotGlow}
            autoRotate={autoRotate}
            showLabels={showLabels}
            showGrid={showGrid}
            cameraPreset={cameraPreset}
            sliceAxis={sliceAxis}
            slicePosition={slicePosition}
            cortexColor={cortexColor}
            hotspotColor={hotspotColor}
            onTelemetryComputed={handleTelemetry}
          />

          {/* Bottom Camera Orientation Bar */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-2xl shadow-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              View:
            </span>
            {(
              [
                { id: "default", label: "3D Iso" },
                { id: "superior", label: "Superior (Top)" },
                { id: "left_lateral", label: "Left Sagittal" },
                { id: "right_lateral", label: "Right Sagittal" },
                { id: "anterior", label: "Anterior" },
                { id: "hotspot_focus", label: "Focus Seizure" },
              ] as { id: CameraPreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setAutoRotate(false);
                  setCameraPreset(preset.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  cameraPreset === preset.id
                    ? "bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_12px_rgba(0,224,255,0.4)]"
                    : "bg-slate-800/70 hover:bg-slate-800 text-slate-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        {!presentationMode && (
          <aside className="w-80 border-l border-slate-800/90 bg-slate-900/65 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Mesh Layer Controls
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowCortex(!showCortex)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition ${
                      showCortex
                        ? "bg-slate-800 border-slate-600 text-white"
                        : "bg-slate-900/50 border-slate-800 text-slate-500"
                    }`}
                  >
                    {showCortex ? <Eye className="w-3.5 h-3.5 text-slate-300" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Cortex</span>
                  </button>

                  <button
                    onClick={() => setShowHotspot(!showHotspot)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition ${
                      showHotspot
                        ? "bg-cyan-950/80 border-cyan-500/80 text-cyan-300"
                        : "bg-slate-900/50 border-slate-800 text-slate-500"
                    }`}
                  >
                    {showHotspot ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Seizure Zone</span>
                  </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Cortex Opacity</span>
                    <span className="font-mono text-cyan-400">{Math.round(cortexOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={cortexOpacity}
                    onChange={(e) => setCortexOpacity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Seizure Emissive Glow</span>
                    <span className="font-mono text-cyan-400">{hotspotGlow.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.1"
                    value={hotspotGlow}
                    onChange={(e) => setHotspotGlow(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Surgical Slicer */}
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                    Surgical Cortex Slicer
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {(
                    [
                      { axis: "none", label: "Off" },
                      { axis: "x", label: "Sagittal" },
                      { axis: "y", label: "Axial" },
                      { axis: "z", label: "Coronal" },
                    ] as { axis: SliceAxis; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.axis}
                      onClick={() => setSliceAxis(item.axis)}
                      className={`py-1.5 rounded-lg border font-medium transition ${
                        sliceAxis === item.axis
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {sliceAxis !== "none" && (
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Slice Depth</span>
                      <span className="font-mono text-cyan-300">{Math.round(slicePosition * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={slicePosition}
                      onChange={(e) => setSlicePosition(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Render Modes
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setWireframe(!wireframe)}
                    className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition ${
                      wireframe ? "bg-indigo-950/80 border-indigo-400 text-indigo-200" : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Wireframe</span>
                  </button>

                  <button
                    onClick={() => setPulseHotspot(!pulseHotspot)}
                    className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition ${
                      pulseHotspot ? "bg-cyan-950/80 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pulse EZ</span>
                  </button>

                  <button
                    onClick={() => setShowLabels(!showLabels)}
                    className={`py-2 px-3 rounded-xl border font-medium transition ${
                      showLabels ? "bg-slate-800 border-slate-600 text-white" : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    3D Pin: {showLabels ? "ON" : "OFF"}
                  </button>

                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`py-2 px-3 rounded-xl border font-medium transition ${
                      autoRotate ? "bg-emerald-950/70 border-emerald-500/80 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    Orbit: {autoRotate ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Hotspot Color</span>
                  <div className="flex items-center gap-2">
                    {[
                      { hex: "#00e0ff", name: "Cyan" },
                      { hex: "#f43f5e", name: "Crimson" },
                      { hex: "#f59e0b", name: "Amber" },
                      { hex: "#10b981", name: "Emerald" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        title={c.name}
                        onClick={() => setHotspotColor(c.hex)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          hotspotColor === c.hex ? "scale-125 border-white" : "border-transparent opacity-75"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCortexOpacity(0.22);
                setShowCortex(true);
                setShowHotspot(true);
                setWireframe(false);
                setSliceAxis("none");
                setHotspotColor("#00e0ff");
                setCameraPreset("default");
                setAutoRotate(true);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Surgical Viewport</span>
            </button>
          </aside>
        )}
      </div>

      <ARModal
        isOpen={isAROpen}
        onClose={() => setIsAROpen(false)}
        modelUrl={selectedPatient.modelUrl}
        patientName={selectedPatient.name}
      />
    </div>
  );
}