"use client";

import { useState } from "react";

const sample = `[
  {
    "name": "MediFlow EHR",
    "description": "Cloud hospital management suite with OPD/IPD workflows and billing",
    "category": "saas",
    "useCases": ["hospital management", "ehr"],
    "tags": ["healthcare", "workflow"],
    "pricing": { "amount": 19, "currency": "USD", "billingPeriod": "month" }
  }
]`;

export default function BulkImportForm() {
  const [jsonText, setJsonText] = useState(sample);
  const [result, setResult] = useState<string>("");

  async function onImport() {
    setResult("Importing...");
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setResult("Invalid JSON format.");
      return;
    }
    const res = await fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const data = await res.json();
    if (!res.ok) {
      setResult(`Error: ${JSON.stringify(data)}`);
      return;
    }
    setResult(`Imported: ${data.succeeded}, Failed: ${data.failed}`);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Bulk JSON Import</h2>
      <textarea className="h-64 w-full rounded border p-2 font-mono text-sm" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
      <button onClick={onImport} className="rounded bg-zinc-900 px-4 py-2 text-white">
        Import
      </button>
      <p className="text-sm text-zinc-600">{result}</p>
    </div>
  );
}
