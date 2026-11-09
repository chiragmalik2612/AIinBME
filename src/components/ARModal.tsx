"use client";

import React, { useEffect } from "react";
import { X, Smartphone, Sparkles } from "lucide-react";

interface ARModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelUrl: string;
  patientName: string;
}

export default function ARModal({
  isOpen,
  onClose,
  modelUrl,
  patientName,
}: ARModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    // Dynamically load Google's model-viewer web component
    if (!customElements.get("model-viewer")) {
      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
      document.head.appendChild(script);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://localhost:3000";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    currentOrigin
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Left 2 Columns: Interactive WebXR / AR Model Viewer */}
        <div className="md:col-span-2 h-[420px] bg-slate-950 relative flex items-center justify-center">
          {React.createElement(
            "model-viewer" as any,
            {
              src: modelUrl,
              alt: `3D AR Brain Model for ${patientName}`,
              ar: true,
              "ar-modes": "webxr scene-viewer quick-look",
              "camera-controls": true,
              "auto-rotate": true,
              "shadow-intensity": "1",
              exposure: "1.2",
              style: { width: "100%", height: "100%", backgroundColor: "#020617" },
            },
            <button
              slot="ar-button"
              className="absolute bottom-4 left-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Launch AR in Room (WebXR / QuickLook)
            </button>
          )}
        </div>

        {/* Right Column: Mobile AR Instructions & QR Code */}
        <div className="p-6 flex flex-col justify-between bg-slate-900 border-l border-slate-800">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                <Smartphone className="w-4 h-4" />
                AR Surgical Projection
              </span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-white mt-2">{patientName}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              This binary glTF 2.0 model is AR-ready. Open this platform on an iOS or
              Android device once deployed to project the 3D cortex and seizure zone onto
              any physical surface.
            </p>

            <div className="mt-5 flex flex-col items-center bg-slate-950/90 border border-slate-800 rounded-xl p-4">
              <img
                src={qrUrl}
                alt="Mobile AR QR Code"
                className="w-36 h-36 rounded-lg bg-white p-2"
              />
              <span className="text-[11px] text-slate-400 mt-2 font-mono">
                Scan on Mobile (Once Deployed)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            Return to 3D Navigation Suite
          </button>
        </div>
      </div>
    </div>
  );
}