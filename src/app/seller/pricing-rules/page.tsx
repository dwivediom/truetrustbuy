"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useCallback, useEffect, useState } from "react";

type TierRow = { minQty: number; maxQty: number | null; unitPrice: number; leadTimeDays?: number };

type ProductRow = { _id: string; name: string; category: string };

type RuleRow = {
  _id: string;
  productId: string;
  currency: string;
  moq: number;
  tiers: TierRow[];
};

const emptyTier = (): TierRow => ({ minQty: 1, maxQty: null, unitPrice: 0, leadTimeDays: undefined });

export default function SellerPricingRulesPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [moq, setMoq] = useState(1);
  const [tiers, setTiers] = useState<TierRow[]>([emptyTier(), { ...emptyTier(), minQty: 1001, maxQty: null, unitPrice: 0 }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, rRes] = await Promise.all([
        fetch("/api/seller/products", { credentials: "include" }),
        fetch("/api/seller/pricing-rules", { credentials: "include" }),
      ]);
      if (!pRes.ok || !rRes.ok) {
        setError("Could not load data. Sign in as a seller.");
        return;
      }
      const pJson = (await pRes.json()) as { products: ProductRow[] };
      const rJson = (await rRes.json()) as { rules: RuleRow[] };
      const plist = pJson.products ?? [];
      setProducts(plist);
      setRules(rJson.rules ?? []);
      setProductId((prev) => prev || (plist[0] ? String(plist[0]._id) : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/seller/pricing-rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          currency,
          moq,
          tiers: tiers.map((t) => ({
            minQty: t.minQty,
            maxQty: t.maxQty === null || t.maxQty === ("" as unknown as number) ? null : t.maxQty,
            unitPrice: t.unitPrice,
            ...(typeof t.leadTimeDays === "number" && t.leadTimeDays > 0 ? { leadTimeDays: t.leadTimeDays } : {}),
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  function updateTier(i: number, patch: Partial<TierRow>) {
    setTiers((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function addTier() {
    setTiers((prev) => [...prev, emptyTier()]);
  }

  function removeTier(i: number) {
    setTiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  function loadRuleIntoForm(r: RuleRow) {
    setProductId(r.productId);
    setCurrency(r.currency || "INR");
    setMoq(r.moq ?? 1);
    setTiers(r.tiers?.length ? r.tiers.map((t) => ({ ...t })) : [emptyTier()]);
  }

  return (
    <SellerPageShell
      title="Tiered pricing"
      subtitle='MOQ and quantity bands power buyer search and the AI assistant. Tiers must not overlap; only the last row may leave max quantity empty for "and above".'
    >
      {error ? (
        <p className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Saved rules</h2>
        {loading ? (
          <p className="mt-3 text-sm font-medium text-slate-500">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-slate-500">No pricing rules yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rules.map((r) => (
              <li key={r._id}>
                <button
                  type="button"
                  onClick={() => loadRuleIntoForm(r)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm transition hover:border-brand-300 hover:bg-white"
                >
                  <span className="font-semibold text-slate-900">
                    {products.find((p) => String(p._id) === r.productId)?.name ?? r.productId}
                  </span>
                  <span className="ml-2 font-medium text-slate-500">
                    MOQ {r.moq} · {r.tiers?.length ?? 0} tiers · {r.currency}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={saveRule} className="mt-10 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Edit rule</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Product
            <select
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p._id} value={String(p._id)}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Currency
            <select
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          MOQ (minimum order quantity)
          <input
            type="number"
            min={1}
            className="mt-1 w-full max-w-xs rounded-2xl border border-slate-300 px-3 py-2"
            value={moq}
            onChange={(e) => setMoq(Number(e.target.value) || 1)}
          />
        </label>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Quantity tiers</h3>
            <button
              type="button"
              onClick={addTier}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Add tier
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2 font-medium">Min qty</th>
                  <th className="py-2 pr-2 font-medium">Max qty</th>
                  <th className="py-2 pr-2 font-medium">Unit price</th>
                  <th className="py-2 pr-2 font-medium">Lead (days)</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {tiers.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        value={row.minQty}
                        onChange={(e) => updateTier(i, { minQty: Number(e.target.value) || 1 })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="empty = unlimited"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        value={row.maxQty ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateTier(i, { maxQty: v === "" ? null : Number(v) });
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        value={row.unitPrice}
                        onChange={(e) => updateTier(i, { unitPrice: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="—"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        value={row.leadTimeDays ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateTier(i, {
                            leadTimeDays: v === "" ? undefined : Number(v) || undefined,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeTier(i)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remove tier"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !productId}
          className="rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save pricing rule"}
        </button>
      </form>
    </SellerPageShell>
  );
}
