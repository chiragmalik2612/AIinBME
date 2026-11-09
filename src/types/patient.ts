export type CameraPreset =
  | "default"
  | "superior"
  | "anterior"
  | "posterior"
  | "left_lateral"
  | "right_lateral"
  | "hotspot_focus";

export type SliceAxis = "none" | "x" | "y" | "z";

export interface MeshTelemetry {
  cortexVertices: number;
  cortexTriangles: number;
  hotspotVertices: number;
  hotspotTriangles: number;
  brainDimensionsMm: [number, number, number];
  hotspotDimensionsMm: [number, number, number];
  hotspotCentroidMm: [number, number, number];
  estimatedHotspotVolumeCm3: number;
}

export interface PatientRecord {
  id: string;
  code: string;
  name: string;
  age: number;
  sex: "M" | "F";
  epilepsyType: string;
  seizureOnsetZone: string;
  hemisphere: "Left Hemisphere" | "Right Hemisphere" | "Bilateral";
  confidence: number;
  mriStatus: string;
  eegConcordance: string;
  modelUrl: string;
  clinicalNotes: string;
}