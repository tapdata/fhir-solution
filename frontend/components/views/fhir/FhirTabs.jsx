"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, LayoutDashboard, Workflow, Beaker, FileJson2, ServerCog } from "lucide-react";

import FhirOverview from "./FhirOverview";
import FhirDataTransformation from "./FhirDataTransformation";
import FhirSyntheticPanel from "./FhirSyntheticPanel";
import FhirResourceBrowser from "./FhirResourceBrowser";
import FhirApiTester from "./FhirApiTester";

export default function FhirTabs() {
  const [enabled, setEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const flag = process.env.NEXT_PUBLIC_ENABLE_FHIR;
    setEnabled(flag === undefined ? true : flag === "true");
  }, []);

  if (!enabled) return null;

  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Database className="text-blue-400" size={18} />
        <h2 className="text-slate-200 font-semibold">FHIR Data Model Transformation</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            <LayoutDashboard className="mr-2" size={14} /> Overview
          </TabsTrigger>

          <TabsTrigger value="synthetic" className="data-[state=active]:bg-slate-700">
            <Beaker className="mr-2" size={14} /> Synthetic Data
          </TabsTrigger>

          <TabsTrigger value="transformation" className="data-[state=active]:bg-slate-700">
            <Workflow className="mr-2" size={14} /> Data Transformation
          </TabsTrigger>

          <TabsTrigger value="resources" className="data-[state=active]:bg-slate-700">
            <FileJson2 className="mr-2" size={14} /> Data Viewer
          </TabsTrigger>

          <TabsTrigger value="fhir-api" className="data-[state=active]:bg-slate-700">
            <ServerCog className="mr-2" size={14} /> FHIR API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FhirOverview onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="synthetic">
          <FhirSyntheticPanel />
        </TabsContent>

        <TabsContent value="transformation">
          <FhirDataTransformation />
        </TabsContent>

        <TabsContent value="resources">
          <FhirResourceBrowser />
        </TabsContent>

        <TabsContent value="fhir-api">
          <FhirApiTester />
        </TabsContent>
      </Tabs>
    </div>
  );
}
