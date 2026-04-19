"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useCallback, useEffect, useState } from "react";

type Rule = {
  _id: string;
  productId: string | null;
  label: string;
  statement: string;
  priority: number;
  enabled: boolean;
};

export default function SellerAgentRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [statement, setStatement] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/agent-rules", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { rules: Rule[] };
    setRules(data.rules ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/seller/agent-rules", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: statement.trim(), label: label.trim() || undefined, productId: null }),
    });
    if (!res.ok) {
      setMsg("Could not save rule.");
      return;
    }
    setStatement("");
    setLabel("");
    await load();
    setMsg("Rule added. Higher priority rules are applied first.");
  }

  async function toggleRule(r: Rule) {
    await fetch(`/api/seller/agent-rules/${r._id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    await load();
  }

  async function removeRule(id: string) {
    await fetch(`/api/seller/agent-rules/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  return (
    <SellerPageShell
      title="Agent rules (FAQ)"
      subtitle="Fixed policies the AI must follow (e.g. no shipping discounts, customization minimums). These override generic chat behavior."
    >
      <form onSubmit={addRule} className="mb-8 space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Label (optional)
          <input
            className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Shipping policy"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Statement
          <textarea
            required
            className="mt-1 min-h-[100px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="We do not offer discounts on freight. Minimum 5000 units for custom colors."
          />
        </label>
        <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
          Add rule
        </button>
        {msg ? <p className="text-sm font-medium text-slate-600">{msg}</p> : null}
      </form>

      <ul className="space-y-2">
        {rules.map((r) => (
          <li
            key={r._id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{r.label || "Rule"}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{r.statement}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Priority {r.priority} · {r.enabled ? "on" : "off"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleRule(r)}
                className="rounded-xl border border-slate-300 px-3 py-1 text-xs font-semibold"
              >
                {r.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => removeRule(r._id)}
                className="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </SellerPageShell>
  );
}
