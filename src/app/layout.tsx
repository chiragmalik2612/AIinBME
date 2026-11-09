import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "NeuroNav 3D | Epileptogenic Zone Surgical Visualization",
  description:
    "Interactive 3D & AR web platform for visualizing anatomical brain cortex and predicted epileptogenic seizure zones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950 overflow-hidden">
        {children}
      </body>
    </html>
  );
}