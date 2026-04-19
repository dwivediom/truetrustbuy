"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useCallback, useEffect, useState } from "react";

export default function SellerVerificationPage() {
  const [gstin, setGstin] = useState("");
  const [documentsStr, setDocumentsStr] = useState("");
  const [orgId, setOrgId] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/profile-bundle", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        orgId?: string;
        verification?: { status?: string } | null;
      };
      if (data.orgId) setOrgId(data.orgId);
      if (data.verification?.status) setVerificationStatus(data.verification.status);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const documents = documentsStr
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const oid = orgId.trim();
    if (!oid) {
      setError(
        "Missing organization id on your profile. Finish seller registration so an org row exists.",
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/seller/verification/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: oid,
          gstin: gstin.trim(),
          documents,
        }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error ?? "Submit failed"));
        return;
      }
      setMsg("Submitted for review. Admins approve from the verification queue.");
      setVerificationStatus("pending");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SellerPageShell
      title="Trust verification"
      subtitle="GSTIN and supporting document URLs unlock the verified badge once an admin approves."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Org ID used for linkage:{" "}
          <code className="rounded-xl bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-900">
            {loading ? "…" : orgId || "Not set"}
          </code>
        </p>
        {!loading && verificationStatus ? (
          <p className="mt-4 text-sm font-semibold capitalize text-slate-800">
            Latest submission status:{" "}
            <span className="text-brand-700">{verificationStatus}</span>
          </p>
        ) : (
          <p className="mt-4 text-sm font-medium text-slate-600">No verification record yet.</p>
        )}

        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            GSTIN (15 characters)
            <input
              required
              minLength={10}
              maxLength={32}
              className="mt-1 w-full max-w-md rounded-2xl border border-slate-300 px-3 py-2 uppercase tracking-wide text-slate-900"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="22AAAAA0000A1Z5"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Supporting document URLs (comma or newline separated)
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={documentsStr}
              onChange={(e) => setDocumentsStr(e.target.value)}
              placeholder="https://cdn.example.com/gst.pdf"
            />
          </label>

          <button
            type="submit"
            disabled={saving || loading || !orgId}
            className="rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Submitting…" : "Submit for review"}
          </button>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
              {error}
            </p>
          ) : null}
          {msg ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950">
              {msg}
            </p>
          ) : null}
        </form>
      </div>
    </SellerPageShell>
  );
}
