"use client";

import React, { useState } from "react";
import { ExternalLink, Loader2, KeyRound, User } from "lucide-react";

export default function FhirDataTransformation() {
  const [opening, setOpening] = useState(false);

  const handleOpenTapdataDataflow = async () => {
    setOpening(true);
    try {
      const res = await fetch("/api/internal/tapdata/dataflow", { method: "GET" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
      if (!data?.target_url) throw new Error("Missing target_url from backend.");

      const win = window.open(data.target_url, "_blank", "noopener,noreferrer");
      if (!win) {
        alert("Pop-up was blocked. Please allow pop-ups for this site to view the transformation.");
      }
    } catch (e) {
      alert(`Open Tapdata failed: ${e?.message || e}`);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* 顶部说明区 */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60">
        <div className="text-slate-200 text-sm leading-relaxed">
          <span>Click </span>
          <button
            type="button"
            onClick={handleOpenTapdataDataflow}
            disabled={opening}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-600/90 hover:bg-amber-600 text-white text-sm font-medium border border-amber-400/30 align-middle disabled:opacity-70 disabled:cursor-not-allowed"
            title="Open Tapdata Dataflow"
          >
            {opening ? <Loader2 className="animate-spin" size={14} /> : <ExternalLink size={14} />}
            View transformation
          </button>
          <span> to check the details of this transformation in Tapdata.</span>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-slate-300 text-sm font-medium">
            Please use the following credentials to login:
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <User className="text-slate-400 mt-0.5" size={16} />
              <div className="text-slate-300 text-sm">
                <div className="text-slate-400 text-xs uppercase tracking-wide">Username</div>
                <a
                  className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                  href="mailto:fhir@tapdata.io"
                >
                  fhir@tapdata.io
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <KeyRound className="text-slate-400 mt-0.5" size={16} />
              <div className="text-slate-300 text-sm">
                <div className="text-slate-400 text-xs uppercase tracking-wide">Password</div>
                <code className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  fhirGotapd54!
                </code>
              </div>
            </div>
          </div>

          <div className="mt-3 text-slate-500 text-xs">
            If the browser blocks the new window, allow pop-ups for this site and try again.
          </div>
        </div>
      </div>

      {/* 图片区：浅灰背景（不再是白底） */}
      <div className="p-4 bg-slate-200 flex justify-center items-center min-h-[400px]">
        <div className="rounded-lg overflow-hidden border border-slate-350 bg-slate-250 w-[75%]">
          <img
            src="/patient.png"
            alt="Patient Transformation diagram"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}
