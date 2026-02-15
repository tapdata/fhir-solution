"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Database } from "lucide-react";

// Helper for API path
const API = (path) => `/api/internal${path.startsWith("/") ? path : `/${path}`}`;

export default function FhirSyntheticPanel() {
  const [activeTab, setActiveTab] = useState("patient");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Column definitions based on your create.txt schema
  // NOTE: religion/race tables removed; patient.religion and patient.race removed.
  const columnsMap = {
    patient: [
      "patient_key",
      "adminid",
      "patient_name",
      "sex",
      "dob",
      "marital_status",
      "home_phone",
      "office_phone",
      "patient_type",
      "update_hospital",
      "death_indicator",
      "death_date",
      "access_code",
      "address_id",
      "cccode1",
      "cccode2",
      "cccode3",
      "cccode4",
      "cccode5",
      "cccode6"
    ],
    patient_info_log: [
      "patient_key", 
      "doc_code", 
      "doc_no", 
      "old_doc_code", 
      "old_doc_no"
    ],
    address_detail: [
      "record_id", 
      "room", 
      "floor", 
      "building", 
      "street", 
      "district", 
      "city", 
      "state", 
      "country"
    ],
    document_type: [
      "document_type", 
      "document_code", 
      "description", 
      "adminid_type", 
      "pay_code"
    ],
    patient_hospital_data: [
      "patient_key", 
      "hospital_code", 
      "mrn", 
      "update_by", 
      "row_update_datetime"
    ],
    hospital: [
      "hospital_code", 
      "hospital_name", 
      "active_status"
    ]
  };

  const displayColumns = columnsMap[activeTab] || [];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData([]);

      try {
        const res = await fetch(API(`/postgres/${activeTab}?limit=50`));

        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.detail || `Error fetching ${activeTab}`);
        }

        const result = await res.json();
        setData(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Failed to fetch data", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 min-h-[600px] flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-slate-200">
          <Database className="text-blue-400" size={20} />
          <h3 className="font-semibold">PostgreSQL Data Explorer</h3>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1">
          {/* Scrollable Tab Navigation */}
          <div className="w-full overflow-x-auto pb-2 mb-2 border-b border-slate-700">
            <TabsList className="bg-transparent h-auto p-0 gap-1 flex justify-start w-max">
              {Object.keys(columnsMap).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="
                    px-3 py-2 rounded-t-md border-b-2 border-transparent
                    data-[state=active]:bg-slate-800
                    data-[state=active]:text-blue-400
                    data-[state=active]:border-blue-400
                    text-slate-400 hover:text-slate-200 hover:bg-slate-800/50
                    transition-all text-xs uppercase tracking-wide font-medium
                  "
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative overflow-hidden rounded-md bg-slate-950 border border-slate-800">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                <div className="flex flex-col items-center gap-2 text-blue-400">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="text-sm">Loading {activeTab}...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-8 text-center text-red-400">
                <p className="font-semibold">Error loading data</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="overflow-auto h-[500px] w-full">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {displayColumns.length > 0 ? (
                        displayColumns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 font-semibold tracking-wider border-b border-slate-700 whitespace-nowrap bg-slate-900"
                          >
                            {col}
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3">Raw Data</th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {data.length > 0 ? (
                      data.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-900/50 transition-colors">
                          {displayColumns.map((col) => {
                            let val = row[col];
                            if (typeof val === "object" && val !== null) val = JSON.stringify(val);

                            return (
                              <td key={`${index}-${col}`} className="px-4 py-2 font-mono whitespace-nowrap">
                                {val ?? <span className="text-slate-600">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={displayColumns.length || 1}
                          className="px-6 py-10 text-center text-slate-500"
                        >
                          No records found in table "{activeTab}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
