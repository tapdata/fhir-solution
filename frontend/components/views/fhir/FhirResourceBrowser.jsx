"use client";

import React, { useEffect, useState } from "react";
import { Search, RefreshCw, Database } from "lucide-react";
import JsonEditor from "./JsonEditor";

const API = (path) => `/api/internal${path.startsWith("/") ? path : `/${path}`}`;

// Helpers to extract data from FHIR structure
const getIdentifierValue = (identifiers, systemKey) => {
  if (!Array.isArray(identifiers)) return "-";
  // Simple check if system string contains the key (e.g. "adminid")
  const found = identifiers.find(i => i.system && i.system.toLowerCase().includes(systemKey.toLowerCase()));
  return found ? found.value : "-";
};

const getPatientName = (resource, app) => {
  if (resource.name && resource.name.length > 0 && resource.name[0].text) {
    return resource.name[0].text;
  }
  if (app && app.patientName) {
    return app.patientName;
  }
  return "Unknown";
};

export default function FhirResourceBrowser() {
  const [resourceType, setResourceType] = useState("Patient");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("resourceType", resourceType);
      if (query) params.set("q", query);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(API(`/inspect/resources?${params.toString()}`));
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Reload when type/page changes
  useEffect(() => {
    setPage(1); // reset to page 1 on type change
    setQuery("");
    setSelected(null);
  }, [resourceType]);

  useEffect(() => {
    fetchList();
  }, [resourceType, page, limit]); // Removed 'query' from deps to avoid debounce issues, use enter/click

  return (
    <div className="flex h-[600px] border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
      {/* Left Sidebar: List */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[300px]">
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-800 flex flex-col gap-3 bg-slate-900/50">
          <div className="flex gap-2">
            <select
              className="bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              <option value="Patient">Patient</option>
              <option value="Encounter">Encounter</option>
            </select>
            
            <button 
              onClick={fetchList} 
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-400 transition-colors ml-auto"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-500" size={14} />
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500 transition-all"
              placeholder={`Search ${resourceType}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchList()}
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
          )}
          
          {!loading && items.length === 0 && (
            <div className="p-8 text-center text-slate-600 text-sm">No resources found</div>
          )}

          {!loading && items.map((it, idx) => {
            const res = it.resource || {};
            const isPatient = resourceType === "Patient";
            
            // Render logic based on resource type
            let title = "Unknown";
            let sub1 = "-";
            let sub2 = "-";

            if (isPatient) {
              title = getPatientName(res, it.app);
              sub1 = `ID: ${getIdentifierValue(res.identifier, "adminid")}`;
              sub2 = `MRN: ${getIdentifierValue(res.identifier, "mrn")}`;
            } else {
              // Encounter logic
              title = `Encounter: ${res.id || "No ID"}`;
              sub1 = `Status: ${res.status || "-"}`;
              sub2 = `Class: ${res.class?.code || "-"}`;
            }

            return (
              <div
                key={it._id || idx}
                onClick={() => setSelected(it)}
                className={`
                  p-3 border-b border-slate-800 cursor-pointer transition-all
                  hover:bg-slate-800/80
                  ${selected === it ? "bg-blue-900/20 border-l-2 border-l-blue-500 pl-[10px]" : "border-l-2 border-l-transparent pl-3"}
                `}
              >
                <div className="font-medium text-slate-200 text-sm truncate">{title}</div>
                <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                  <span className="font-mono bg-slate-800/50 px-1 rounded">{sub1}</span>
                  <span className="font-mono">{sub2}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer (Pagination info) */}
        <div className="p-2 border-t border-slate-800 text-xs text-slate-500 text-center bg-slate-900/50">
           Showing {items.length} of {total}
        </div>
      </div>

      {/* Right Content: JSON Editor */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {selected ? (
          <JsonEditor
            value={JSON.stringify(selected, null, 2)}
            readOnly={true}
            height="100%"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-3">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800">
                <Database size={32} className="opacity-40" />
            </div>
            <span className="text-sm font-medium opacity-60">Select a resource to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}
