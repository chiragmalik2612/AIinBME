"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
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
  Grid as GridIcon,
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
  X,
} from "lucide-react";

const BrainScene = dynamic(() => import("@/components/BrainScene"), {
  ssr: false,
});

const ALL_PATIENT_FOLDERS = [
  "sub-PID02",
  "sub-PID03",
  "sub-PID04",
  "sub-PID07",
  "sub-PID08",
  "sub-PID12",
  "sub-PID17",
  "sub-PID18",
  "sub-PID19",
  "sub-PID20",
  "sub-PID21",
  "sub-PID22",
  "sub-PID25",
  "sub-PID27",
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

type MobileSheet = "none" | "patients" | "controls";

export default function EpilepsyNavigationPlatform() {
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState<PatientRecord[]>(STATIC_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord>(
    STATIC_PATIENTS[1]
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>("none");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 3D Visual Controls State
  const [cortexOpacity, setCortexOpacity] = useState<number>(0.22);
  const [showCortex, setShowCortex] = useState<boolean>(true);
  const [showHotspot, setShowHotspot] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [pulseHotspot, setPulseHotspot] = useState<boolean>(true);
  const [hotspotGlow, setHotspotGlow] = useState<number>(1.5);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
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
    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    setMobileSheet("none");
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

  const resetAllControls = () => {
    setCortexOpacity(0.22);
    setShowCortex(true);
    setShowHotspot(true);
    setWireframe(false);
    setSliceAxis("none");
    setHotspotColor("#00e0ff");
    setCameraPreset("default");
    setAutoRotate(true);
    setShowGrid(true);
  };

  if (!isMounted) return null;

  return (
    <div
      className="flex flex-col h-[100dvh] w-screen bg-slate-950 text-slate-100 select-none overflow-hidden"
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
        <div className="fixed inset-0 z-50 bg-cyan-950/80 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center p-4 text-center">
          <Upload className="w-12 h-12 text-cyan-300 animate-bounce" />
          <h2 className="text-lg sm:text-xl font-bold text-white mt-3">
            Drop Patient .GLB File to Visualize Instantly
          </h2>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="h-14 shrink-0 border-b border-slate-800/90 bg-slate-900/85 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,224,255,0.2)]">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm tracking-wide text-white">
                NEURONAV 3D
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                14-Patient Cohort Suite
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 truncate">
              3D Cortical Reconstruction & Seizure Zone Localization
            </p>
          </div>
        </div>

        {/* Desktop Center Quick-Switcher */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-3 py-1 rounded-full text-xs">
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
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Load .GLB</span>
          </button>

          <button
            onClick={() => setIsAROpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-[0_0_20px_rgba(0,224,255,0.3)] transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>AR View</span>
          </button>

          <button
            onClick={() => setPresentationMode(!presentationMode)}
            title="Toggle Presentation Fullscreen Mode"
            className="hidden sm:flex p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            {presentationMode ? (
              <Minimize2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Compact Patient Bar (Visible only below lg) */}
      {!presentationMode && (
        <div className="flex lg:hidden items-center justify-between bg-slate-900/95 border-b border-slate-800 px-3 py-2 text-xs z-20 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={goPrevPatient}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 active:bg-cyan-500 active:text-slate-950"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2">
              <div className="font-mono font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {selectedPatient.id}
                <span className="text-[10px] text-slate-400 font-normal">
                  ({currentIndex + 1}/{patients.length})
                </span>
              </div>
              <div className="text-[10px] text-cyan-300 truncate max-w-[160px]">
                {telemetry.detectedHemisphere} • {telemetry.estimatedHotspotVolumeCm3} cm³
              </div>
            </div>
            <button
              onClick={goNextPatient}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 active:bg-cyan-500 active:text-slate-950"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Drawer Trigger Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setMobileSheet(mobileSheet === "patients" ? "none" : "patients")
              }
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                mobileSheet === "patients"
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : "bg-slate-800/90 border-slate-700 text-slate-200"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Patients</span>
            </button>

            <button
              onClick={() =>
                setMobileSheet(mobileSheet === "controls" ? "none" : "controls")
              }
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                mobileSheet === "controls"
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : "bg-slate-800/90 border-slate-700 text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Controls</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Left Sidebar */}
        {!presentationMode && (
          <aside className="hidden lg:flex w-80 shrink-0 border-r border-slate-800/90 bg-slate-900/65 backdrop-blur-md p-4 flex-col justify-between overflow-y-auto z-10">
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
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          )}
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
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">Cortical Zone:</span>
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
                  <span
                    className="w-3 h-3 rounded-full border border-white/40"
                    style={{ backgroundColor: cortexColor, opacity: 0.6 }}
                  />
                  <span className="text-slate-300">Brain_Cortex</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Node 0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shadow-[0_0_10px_#00e0ff]"
                    style={{ backgroundColor: hotspotColor }}
                  />
                  <span className="text-cyan-300 font-medium">Seizure_Zone</span>
                </div>
                <span className="font-mono text-[10px] text-cyan-500">Node 1</span>
              </div>
            </div>
          </aside>
        )}

        {/* Center 3D Viewport */}
        <main className="flex-1 relative bg-slate-950 w-full h-full overflow-hidden">
          <BrainScene
            modelUrl={selectedPatient.modelUrl}
            cortexOpacity={cortexOpacity}
            showCortex={showCortex}
            showHotspot={showHotspot}
            wireframe={wireframe}
            pulseHotspot={pulseHotspot}
            hotspotGlow={hotspotGlow}
            autoRotate={autoRotate}
            showLabels={false}
            showGrid={showGrid}
            cameraPreset={cameraPreset}
            sliceAxis={sliceAxis}
            slicePosition={slicePosition}
            cortexColor={cortexColor}
            hotspotColor={hotspotColor}
            onTelemetryComputed={handleTelemetry}
          />

          {/* Responsive Swipeable Camera Orientation Bar */}
          <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-10 max-w-[95vw] overflow-x-auto flex items-center gap-1 sm:gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl shadow-2xl">
            <span className="hidden sm:flex text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1.5 items-center gap-1 shrink-0">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              View:
            </span>
            {(
              [
                { id: "default", label: "3D Iso" },
                { id: "superior", label: "Superior" },
                { id: "left_lateral", label: "Left" },
                { id: "right_lateral", label: "Right" },
                { id: "anterior", label: "Anterior" },
                { id: "hotspot_focus", label: "Focus EZ" },
              ] as { id: CameraPreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setAutoRotate(false);
                  setCameraPreset(preset.id);
                }}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition ${
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

        {/* Desktop Right Sidebar */}
        {!presentationMode && (
          <aside className="hidden lg:flex w-80 shrink-0 border-l border-slate-800/90 bg-slate-900/65 backdrop-blur-md p-4 flex-col justify-between overflow-y-auto z-10">
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
                    {showCortex ? (
                      <Eye className="w-3.5 h-3.5 text-slate-300" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
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
                    {showHotspot ? (
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>Seizure Zone</span>
                  </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Cortex Opacity</span>
                    <span className="font-mono text-cyan-400">
                      {Math.round(cortexOpacity * 100)}%
                    </span>
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
                    <span className="font-mono text-cyan-400">
                      {hotspotGlow.toFixed(1)}x
                    </span>
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
                      <span className="font-mono text-cyan-300">
                        {Math.round(slicePosition * 100)}%
                      </span>
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
                      wireframe
                        ? "bg-indigo-950/80 border-indigo-400 text-indigo-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Wireframe</span>
                  </button>

                  <button
                    onClick={() => setPulseHotspot(!pulseHotspot)}
                    className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition ${
                      pulseHotspot
                        ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pulse EZ</span>
                  </button>

                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition ${
                      showGrid
                        ? "bg-slate-800 border-slate-600 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    <GridIcon className="w-3.5 h-3.5" />
                    <span>Grid: {showGrid ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`py-2 px-3 rounded-xl border font-medium transition ${
                      autoRotate
                        ? "bg-emerald-950/70 border-emerald-500/80 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-500"
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
                          hotspotColor === c.hex
                            ? "scale-125 border-white"
                            : "border-transparent opacity-75"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={resetAllControls}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Surgical Viewport</span>
            </button>
          </aside>
        )}

        {/* Mobile & Tablet Half-Screen Bottom Sheet Drawer (< lg) */}
        {mobileSheet !== "none" && (
          <div className="lg:hidden absolute inset-x-0 bottom-0 z-30 max-h-[55vh] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {mobileSheet === "patients"
                  ? `Patient Cohort (${patients.length}) & Telemetry`
                  : "3D Mesh & Slicer Controls"}
              </span>
              <button
                onClick={() => setMobileSheet("none")}
                className="p-1 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {mobileSheet === "patients" ? (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {patients.map((patient) => {
                      const active = patient.id === selectedPatient.id;
                      return (
                        <button
                          key={patient.id}
                          onClick={() => {
                            setSelectedPatient(patient);
                            setMobileSheet("none");
                          }}
                          className={`p-2 rounded-xl border text-left transition ${
                            active
                              ? "bg-cyan-950 border-cyan-400 text-white"
                              : "bg-slate-950/70 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="font-mono font-bold text-[11px]">
                            {patient.id}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400">Hemisphere</div>
                      <div className="font-semibold text-cyan-300 mt-0.5">
                        {telemetry.detectedHemisphere}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400">EZ Volume</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        {telemetry.estimatedHotspotVolumeCm3} cm³ (
                        {telemetry.hotspotVolumeRatioPercent}%)
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400">Cortical Zone</div>
                      <div className="font-medium text-slate-200 mt-0.5">
                        {telemetry.detectedAnatomicalRegion}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400">EZ Span (mm)</div>
                      <div className="font-mono text-slate-200 mt-0.5">
                        {telemetry.hotspotDimensionsMm.join(" × ")}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowCortex(!showCortex)}
                      className={`py-2 px-3 rounded-xl border font-medium ${
                        showCortex
                          ? "bg-slate-800 border-slate-600 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-500"
                      }`}
                    >
                      Cortex: {showCortex ? "Shown" : "Hidden"}
                    </button>
                    <button
                      onClick={() => setShowHotspot(!showHotspot)}
                      className={`py-2 px-3 rounded-xl border font-medium ${
                        showHotspot
                          ? "bg-cyan-950 border-cyan-500 text-cyan-300"
                          : "bg-slate-950 border-slate-800 text-slate-500"
                      }`}
                    >
                      Seizure: {showHotspot ? "Shown" : "Hidden"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Cortex Opacity</span>
                        <span className="font-mono text-cyan-400">
                          {Math.round(cortexOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.95"
                        step="0.05"
                        value={cortexOpacity}
                        onChange={(e) => setCortexOpacity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Seizure Glow</span>
                        <span className="font-mono text-cyan-400">
                          {hotspotGlow.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="3.0"
                        step="0.1"
                        value={hotspotGlow}
                        onChange={(e) => setHotspotGlow(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Mobile Slicer */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="text-[11px] font-semibold uppercase text-slate-400">
                      Surgical Cortex Slicer
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
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
                          className={`py-1.5 rounded-lg border font-medium ${
                            sliceAxis === item.axis
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {sliceAxis !== "none" && (
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.05"
                        value={slicePosition}
                        onChange={(e) => setSlicePosition(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setWireframe(!wireframe)}
                      className={`py-2 rounded-xl border font-medium ${
                        wireframe
                          ? "bg-indigo-950 border-indigo-400 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      Wireframe
                    </button>
                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`py-2 rounded-xl border font-medium ${
                        autoRotate
                          ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      Orbit: {autoRotate ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={resetAllControls}
                      className="py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
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