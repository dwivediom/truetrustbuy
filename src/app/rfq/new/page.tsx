"use client";

import { SiteChrome } from "@/components/layout/SiteChrome";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function NewRfqForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [productQuery, setProductQuery] = useState(() => searchParams.get("prefill") ?? "");
  const [quantity, setQuantity] = useState(1000);
  const [budget, setBudget] = useState(0);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("prefill")?.trim()) return;
    const pre =
      typeof window !== "undefined" ? sessionStorage.getItem("ttb_rfq_prefill") : null;
    if (!pre?.trim()) return;
    queueMicrotask(() => {
      setProductQuery(pre);
      sessionStorage.removeItem("ttb_rfq_prefill");
    });
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    const res = await fetch("/api/rfqs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productQuery,
        quantity: Number(quantity) || 1,
        budget: Number(budget) || 0,
        currency: "INR",
      }),
    });
    setLoading(false);
    if (res.status === 401) {
      setMsg("Sign in as a buyer to submit an RFQ.");
      return;
    }
    if (!res.ok) {
      setMsg("Could not submit RFQ.");
      return;
    }
    router.push("/buyer/rfqs");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Create RFQ</h1>
      <p className="mt-2 text-lg font-medium text-slate-600">
        Describe what you need; buyers can track RFQs on the dashboard.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="pq" className="block text-sm font-semibold text-slate-700">
            Product / requirement
          </label>
          <textarea
            id="pq"
            className="mt-1 min-h-[120px] w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            required
            placeholder="e.g. 5000 amber glass bottles 300ml, Mumbai delivery"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="qty" className="block text-sm font-semibold text-slate-700">
              Quantity
            </label>
            <input
              id="qty"
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="budget" className="block text-sm font-semibold text-slate-700">
              Budget (INR)
            </label>
            <input
              id="budget"
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
        </div>
        {msg ? <p className="text-sm font-medium text-red-600">{msg}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit RFQ"}
          </button>
          <Link
            href="/buyer/rfqs"
            className="rounded-full border-2 border-slate-200 px-6 py-3 text-sm font-bold text-slate-800 hover:border-brand-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

export default function NewRfqPage() {
  return (
    <SiteChrome>
      <Suspense fallback={<main className="px-6 py-12 text-slate-600">Loading…</main>}>
        <NewRfqForm />
      </Suspense>
    </SiteChrome>
  );
}
