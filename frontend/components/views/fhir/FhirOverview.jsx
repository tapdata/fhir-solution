"use client";

import React, { useState } from "react";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";

export default function FhirDataTransformation({ onNavigate }) {
  const [opening, setOpening] = useState(false);

  const handleOpenTapdataDataflow = async () => {
    setOpening(true);
    try {
      // 1. 请求后端获取带 Token 的跳转 URL
      const res = await fetch("/api/internal/tapdata/dataflow", { method: "GET" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }
      if (!data?.target_url) {
        throw new Error("Missing target_url from backend.");
      }

      // 2. 直接打开目标 URL (移除之前的 about:blank 预打开逻辑)
      const win = window.open(data.target_url, "_blank", "noopener,noreferrer");
      
      // 如果浏览器拦截了弹窗 (win 为 null)，则提示用户
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
      <div className="p-4">
        {/* 图片容器 */}
        <div className="relative w-full mb-4">
          <img 
            src="/image.jpg" 
            alt="Data Transformation Architecture" 
            className="w-full h-auto object-contain rounded-lg border border-slate-800"
          />
        </div>

        {/* 
          按钮容器
          使用绝对定位 + transform translate 确保按钮中心对齐到特定百分比位置
        */}
        <div className="relative w-full h-12">
          
          {/* OLTP Databases -> View legacy data */}
          <div className="absolute left-[9%] top-0 transform -translate-x-1/2">
            <button
              onClick={() => onNavigate("synthetic")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md shadow-sm transition-all flex items-center gap-2"
            >
              View legacy data
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Data Processing -> View data transformation */}
          <div className="absolute left-[29%] top-0 transform -translate-x-1/2">
            <button
              onClick={handleOpenTapdataDataflow}
              disabled={opening}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md shadow-sm transition-all flex items-center gap-2"
              title="Open Tapdata Dataflow"
            >
              {opening ? <Loader2 className="animate-spin" size={14} /> : null}
              View transformation
              <ExternalLink size={14} />
            </button>
          </div>

          {/* Data Store (FHIR) -> View FHIR data */}
          <div className="absolute left-[50%] top-0 transform -translate-x-1/2">
            <button
              onClick={() => onNavigate("resources")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md shadow-sm transition-all flex items-center gap-2"
            >
              View FHIR data
              <ArrowRight size={14} />
            </button>
          </div>

          {/* MongoDB Data Access -> View FHIR API */}
          <div className="absolute left-[69%] top-0 transform -translate-x-1/2">
            <button
              onClick={() => onNavigate("fhir-api")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-md shadow-sm transition-all flex items-center gap-2"
            >
              View FHIR API
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <p className="text-slate-400 text-sm leading-relaxed">
          This interactive architecture diagram illustrates the end-to-end data transformation pipeline. 
          Click the buttons on the diagram to inspect data at each stage:
          <span className="block mt-2 ml-2">
            • <strong className="text-blue-400">View legacy data</strong>: Inspect the raw source data in the OLTP databases.<br/>
            • <strong className="text-amber-400">View Transformation</strong>: Open the Tapdata Dataflow to see the real-time CDC and mapping logic.<br/>
            • <strong className="text-emerald-400">View FHIR data</strong>: Browse the transformed data stored in the FHIR repository.<br/>
            • <strong className="text-purple-400">View FHIR API</strong>: Test the final published APIs available for application consumption.
          </span>
        </p>
      </div>
      </div>
    </div>
  );
}
