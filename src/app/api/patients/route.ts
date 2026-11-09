import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PATIENTS } from "@/data/patients";
import { PatientRecord } from "@/types/patient";

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public");
    let baseExportDir = path.join(publicDir, "3d_ar_exports");
    let urlPrefix = "/3d_ar_exports";

    // Handle nested 3d_ar_exports/3d_ar_exports if copied directly from Downloads
    const nestedDir = path.join(baseExportDir, "3d_ar_exports");
    if (fs.existsSync(nestedDir) && fs.statSync(nestedDir).isDirectory()) {
      baseExportDir = nestedDir;
      urlPrefix = "/3d_ar_exports/3d_ar_exports";
    }

    if (!fs.existsSync(baseExportDir)) {
      return NextResponse.json({ patients: PATIENTS });
    }

    const entries = fs.readdirSync(baseExportDir, { withFileTypes: true });
    const discovered: PatientRecord[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("sub-")) {
        const subjectFolder = entry.name;
        const subjectPath = path.join(baseExportDir, subjectFolder);
        const files = fs.readdirSync(subjectPath);
        const glbFile = files.find(
          (f) => f.toLowerCase().endsWith(".glb") || f.toLowerCase().endsWith(".gltf")
        );

        if (glbFile) {
          const code = subjectFolder.replace("sub-", "");
          discovered.push({
            id: subjectFolder,
            code,
            name: `Patient ${code}`,
            folderName: subjectFolder,
            modelUrl: `${urlPrefix}/${subjectFolder}/${glbFile}`,
          });
        }
      }
    }

    // Sort numerically by PID number (PID02, PID03, PID04, ...)
    discovered.sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" })
    );

    return NextResponse.json({
      patients: discovered.length > 0 ? discovered : PATIENTS,
    });
  } catch {
    return NextResponse.json({ patients: PATIENTS });
  }
}