"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ContactIntentRow = {
  id: string;
  intentType: string;
  productId: string;
  productName: string;
  replyLanguage: string;
  contactEmail: string;
  contactPhone: string;
  summaryPreview: string;
  summaryFull: string;
  status: string;
  createdAt?: string;
};

function maskEmail(em: string): string {
  const parts = em.split("@");
  if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) return `${em.slice(0, 4)}…`;
  const [u, d] = parts as [string, string];
  return `${u.slice(0, Math.min(2, u.length))}…@${d}`;
}

function maskContact(email: string, phone: string): string {
  const em = email.trim();
  const ph = phone.trim();
  if (em && ph) return `${maskEmail(em)} · ${ph.slice(0, 4)}…`;
  if (em) return maskEmail(em);
  if (ph) return `${ph.slice(0, 4)}…`;
  return "—";
}

export default function SellerBuyerRequestsPage() {
  const [rows, setRows] = useState<ContactIntentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/contact-intents", { credentials: "include" });
      if (!res.ok) {
        setError("Could not load buyer requests.");
        return;
      }
      const data = (await res.json()) as { intents?: ContactIntentRow[] };
      setRows(data.intents ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SellerPageShell title="Buyer contact intents" subtitle="Orders and callbacks requested from search chat.">
      <div className="space-y-6">
        <p className="text-sm font-medium text-slate-600">
          When buyers tap <span className="font-bold text-slate-900">Contact supplier</span> actions in search,
          requests appear here with their summary and preferred reply language.
        </p>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm font-medium text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="font-bold text-slate-900">No requests yet</p>
            <p className="mt-2 text-sm font-medium text-slate-600">
              When buyers confirm an order or ask for a callback from search, you will see it here.
            </p>
            <Link
              href="/seller/dashboard"
              className="mt-4 inline-block text-sm font-bold text-brand-600 underline"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {r.intentType === "order_confirm" ? "Order confirm" : "Callback"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/product/${r.productId}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {r.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.replyLanguage}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600" title={[r.contactEmail, r.contactPhone].filter(Boolean).join(" · ")}>
                      {maskContact(r.contactEmail, r.contactPhone)}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-4 whitespace-pre-wrap text-xs font-medium text-slate-700">
                        {r.summaryPreview}
                      </p>
                      {r.summaryFull.length > r.summaryPreview.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-bold text-brand-600">
                            Full summary
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">
                            {r.summaryFull}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SellerPageShell>
  );
}
