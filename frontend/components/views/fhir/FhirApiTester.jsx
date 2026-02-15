"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Database, FileJson, AlertCircle } from "lucide-react";
import JsonEditor from "./JsonEditor";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const BACKEND_PATH = "/api/internal";

// Configuration for API Endpoints to test
// Updated to reflect the new structure (Patient/Encounter split)
const API_ENDPOINTS = {
  INSPECT_PATIENT: {
    name: "INSPECT_PATIENT",
    title: "Search Patients",
    description: "Search the FHIR_Patient collection using inspection API",
    method: "GET",
    path: "/inspect/resources",
    params: [
      { name: "resourceType", type: "string", default: "Patient", locked: true },
      { name: "q", type: "string", help: "Search by Name, AdminID, or MRN" },
      { name: "limit", type: "number", default: 10 }
    ]
  },
  INSPECT_ENCOUNTER: {
    name: "INSPECT_ENCOUNTER",
    title: "Search Encounters",
    description: "Search the FHIR_Encounter collection using inspection API",
    method: "GET",
    path: "/inspect/resources",
    params: [
      { name: "resourceType", type: "string", default: "Encounter", locked: true },
      { name: "q", type: "string", help: "Search by ID or Status" },
      { name: "limit", type: "number", default: 10 }
    ]
  },
  // Keep legacy SPEC APIs if they are still supported by backend logic
  CPI_CASE_BY_TEAM: {
    name: "CPI_CASE_BY_TEAM",
    title: "[Legacy] CPI Cases by Team",
    description: "Original Spec API for CPI Cases",
    method: "GET",
    path: "/api/v1/cpi_case/_by-team/",
    params: [
      { name: "hospCode", type: "string", required: true, default: "EDH" },
      { name: "teamCode", type: "string" },
      { name: "wardCode", type: "string" }
    ]
  }
};

function buildQueryString(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.append(k, v);
  });
  return sp.toString();
}

function ParamField({ param, value, onChange }) {
  const inputClasses = "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm";
  
  if (param.locked) {
      return (
          <input 
            type="text" 
            value={param.default} 
            disabled 
            className={`${inputClasses} opacity-50 cursor-not-allowed`} 
          />
      );
  }

  return (
    <input
      type={param.type === "number" ? "number" : "text"}
      className={inputClasses}
      placeholder={param.help || ""}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function FhirApiTester() {
  const [selectedEndpointKey, setSelectedEndpointKey] = useState("INSPECT_PATIENT");
  const [params, setParams] = useState({});
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentEndpoint = API_ENDPOINTS[selectedEndpointKey];

  // Initialize default params when endpoint changes
  useEffect(() => {
    const defaults = {};
    if (currentEndpoint.params) {
      currentEndpoint.params.forEach(p => {
        if (p.default !== undefined) defaults[p.name] = p.default;
      });
    }
    setParams(defaults);
    setResponse(null);
    setError(null);
  }, [selectedEndpointKey]);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const queryString = buildQueryString(params);
      const url = `${BACKEND_PATH}${currentEndpoint.path}${queryString ? `?${queryString}` : ""}`;
      
      const options = {
        method: currentEndpoint.method,
        headers: { "Content-Type": "application/json" }
      };

      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      setResponse({
        status: res.status,
        data: data
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] gap-4">
      {/* Left: Controls */}
      <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-1">
        
        {/* Endpoint Selector */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select API Endpoint
          </label>
          <select
            value={selectedEndpointKey}
            onChange={(e) => setSelectedEndpointKey(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          >
            {Object.entries(API_ENDPOINTS).map(([key, def]) => (
              <option key={key} value={key}>
                {def.title}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            {currentEndpoint.description}
          </p>
        </div>

        {/* Parameters */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <FileJson className="text-blue-400" size={18} />
            <h3 className="font-semibold text-slate-200">Parameters</h3>
          </div>
          
          <div className="space-y-4">
            {currentEndpoint.params && currentEndpoint.params.map((param) => (
              <div key={param.name}>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  {param.name} {param.required && <span className="text-red-400">*</span>}
                </label>
                <ParamField 
                  param={param} 
                  value={params[param.name]} 
                  onChange={(val) => setParams(prev => ({ ...prev, [param.name]: val }))}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleExecute}
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            Execute Request
          </button>
        </div>
      </div>

      {/* Right: Response */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Response</span>
          {response && (
            <span className={`text-xs px-2 py-0.5 rounded ${response.status < 400 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              Status: {response.status}
            </span>
          )}
        </div>
        
        <div className="flex-1 relative h-full">
          {error ? (
            <div className="p-6 text-red-400 flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium mb-1">Request Failed</h4>
                <p className="text-sm opacity-80 font-mono bg-red-950/30 p-2 rounded">{error}</p>
              </div>
            </div>
          ) : response ? (
            <JsonEditor
              value={JSON.stringify(response.data, null, 2)}
              readOnly={true}
              height="100%"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-700">
              <div className="text-center">
                <Database size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Ready to execute</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
