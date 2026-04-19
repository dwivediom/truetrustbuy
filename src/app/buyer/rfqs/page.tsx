"use client";

import { SiteChrome } from "@/components/layout/SiteChrome";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Rfq = {
  _id: string;
  productQuery: string;
  quantity: number;
  budget: number;
  currency: string;
  status: string;
  createdAt?: string;
};

export default function BuyerRfqsPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr("");
    const res = await fetch("/api/rfqs", { credentials: "include" });
    if (res.status === 401) {
      setErr("Sign in as a buyer to see RFQs.");
      setRfqs([]);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setErr("Could not load RFQs.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { rfqs: Rfq[] };
    setRfqs(data.rfqs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Your RFQs</h1>
            <p className="mt-2 text-lg font-medium text-slate-600">Requests you submitted as a buyer.</p>
          </div>
          <Link
            href="/rfq/new"
            className="inline-flex justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            New RFQ
          </Link>
        </div>

        {loading ? <p className="mt-10 text-slate-600">Loading…</p> : null}
        {err ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {err}{" "}
            <Link href="/login" className="font-bold underline">
              Sign in
            </Link>
          </div>
        ) : null}

        {!loading && !err && rfqs.length === 0 ? (
          <p className="mt-10 text-slate-600">
            No RFQs yet.{" "}
            <Link href="/rfq/new" className="font-semibold text-brand-600 hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : null}

        {!loading && rfqs.length > 0 ? (
          <ul className="mt-10 space-y-3">
            {rfqs.map((r) => (
              <li
                key={r._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-bold text-slate-900">{r.productQuery}</p>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Qty {r.quantity} · Budget {r.budget} {r.currency} ·{" "}
                  <span className="capitalize">{r.status}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </SiteChrome>
  );
}
