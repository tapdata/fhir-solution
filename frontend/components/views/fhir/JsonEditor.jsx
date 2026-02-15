"use client";
import dynamic from "next/dynamic";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => null,
});

export default function JsonEditor({
  value,
  onChange,
  height = "300px",
  readOnly = false,
}) {
  const displayValue =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <Monaco
        height="100%"
        defaultLanguage="json"
        theme="vs-dark"
        value={displayValue}
        onChange={onChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          wordWrap: "on",
          lineNumbers: "on",
          automaticLayout: true,
        }}
      />
    </div>
  );
}
