"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useEffect, useState } from "react";

export default function SellerProfileExportPage() {
  const [json, setJson] = useState<string>("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/seller/profile-bundle", { credentials: "include" });
      if (!res.ok) {
        setErr("Could not load (sign in as seller).");
        return;
      }
      const data = await res.json();
      setJson(JSON.stringify(data, null, 2));
    })();
  }, []);

  return (
    <SellerPageShell title="Profile JSON bundle" subtitle="Debugging export aligned with seller agent prompts.">
      {err ? <p className="font-semibold text-red-700">{err}</p> : null}
      <pre className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-100 shadow-inner">
        {json || "Loading…"}
      </pre>
    </SellerPageShell>
  );
}
