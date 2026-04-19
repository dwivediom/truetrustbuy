"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useCallback, useEffect, useState } from "react";

type Alert = {
  _id: string;
  message: string;
  typicalSearchMaxPrice: number;
  yourTierUnitPrice: number;
  createdAt?: string;
};

export default function SellerMarketInsightsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/pricing-insights", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { alerts: Alert[] };
    setAlerts(data.alerts ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function dismiss(id: string) {
    await fetch("/api/seller/pricing-insights", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismissed: true }),
    });
    await load();
  }

  return (
    <SellerPageShell
      title="Market insights"
      subtitle={
        <>
          Generated from recent buyer searches vs your tiered pricing. Run the cron job with{" "}
          <code className="rounded-xl bg-slate-100 px-1.5 py-0.5 font-mono text-xs">CRON_SECRET</code> to refresh
          signals.
        </>
      }
    >
      <ul className="space-y-3">
        {alerts.length === 0 ? (
          <li className="rounded-3xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600 shadow-sm">
            No active alerts. Ensure search traffic is logged and run{" "}
            <code className="rounded-xl bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
              GET /api/cron/pricing-insights?secret=…
            </code>
          </li>
        ) : (
          alerts.map((a) => (
            <li key={a._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-800">{a.message}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Search ceiling ~{a.typicalSearchMaxPrice} · your tier ~{a.yourTierUnitPrice}
              </p>
              <button
                type="button"
                onClick={() => dismiss(a._id)}
                className="mt-3 text-xs font-bold text-brand-600 hover:underline"
              >
                Dismiss
              </button>
            </li>
          ))
        )}
      </ul>
    </SellerPageShell>
  );
}
