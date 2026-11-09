import { PatientRecord } from "@/types/patient";

export const PATIENTS: PatientRecord[] = [
  {
    id: "sub-PID03",
    code: "PID-03",
    name: "Subject PID03 (Primary Case)",
    age: 22,
    sex: "M",
    epilepsyType: "Focal Drug-Resistant Epilepsy",
    seizureOnsetZone: "Left Fronto-Temporal / Insular Cortex",
    hemisphere: "Left Hemisphere",
    confidence: 94.8,
    mriStatus: "3T Structural + 3D Cortical Parcellation",
    eegConcordance: "High (Ictal & Interictal Concordant)",
    modelUrl: "/models/sub-PID03_prediction_ar_model.glb",
    clinicalNotes:
      "3D Trimesh reconstruction shows a well-demarcated epileptogenic zone localized in the left lateralized superior-anterior quadrant.",
  },
  {
    id: "sub-PID07",
    code: "PID-07",
    name: "Subject PID07",
    age: 29,
    sex: "F",
    epilepsyType: "Mesial Temporal Lobe Epilepsy",
    seizureOnsetZone: "Left Superior Temporal Gyrus",
    hemisphere: "Left Hemisphere",
    confidence: 91.2,
    mriStatus: "3T T1/FLAIR Volumetric Fusion",
    eegConcordance: "Moderate-High (Phase-Locked HFO)",
    modelUrl: "/models/sub-PID03_prediction_ar_model.glb", // Replace with sub-PID07 file when ready
    clinicalNotes:
      " Candidate for stereotactic laser amygdalohippocampotomy (SLAH) and tailored cortical resection.",
  },
  {
    id: "sub-PID12",
    code: "PID-12",
    name: "Subject PID12",
    age: 16,
    sex: "M",
    epilepsyType: "Focal Cortical Dysplasia (Type IIb)",
    seizureOnsetZone: "Left Dorsolateral Frontal Cortex",
    hemisphere: "Left Hemisphere",
    confidence: 96.4,
    mriStatus: "7T Ultra-High-Field Cortical Mesh",
    eegConcordance: "High (SEEG Confirmed)",
    modelUrl: "/models/sub-PID03_prediction_ar_model.glb", // Replace with sub-PID12 file when ready
    clinicalNotes:
      " focal transmantle sign on FLAIR aligns with the predicted cyan epileptogenic zone mesh.",
  },
];