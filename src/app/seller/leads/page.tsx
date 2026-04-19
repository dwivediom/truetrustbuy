"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import {
  CONNECTION_LABEL,
  CONNECTION_STATUSES,
  type ConnectionStatus,
} from "@/lib/leads/supplier-intent-workflow";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/leads/pipeline-stage";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LeadDisposition = {
  pipelineStage: PipelineStage;
  assignee: string;
  sellerNotes: string;
  updatedAt?: string;
};

type LeadRow = {
  id: string;
  productQuery: string;
  quantity: number;
  budget: number;
  currency: string;
  createdAt: string;
  matchScore: number;
  disposition?: LeadDisposition;
};

type InboundInquiryRow = {
  id: string;
  productInterest: string;
  preferredLanguage: string;
  matchScore: number;
  createdAt: string;
};

type SupplierContactIntentRow = {
  id: string;
  intentType: "order_confirm" | "callback_request";
  productId: string;
  productName: string;
  buyerName: string;
  buyerKind: "registered" | "guest";
  email: string;
  phone: string;
  replyLanguage: string;
  summaryPreview: string;
  summaryFull: string;
  searchQuantity: number | null;
  orderQuantity: number | null;
  unitPrice: number | null;
  priceCurrency: string;
  structuredExtract: Record<string, unknown>;
  connectionStatus: ConnectionStatus;
  contactOwner: string;
  sellerNotes: string;
  createdAt: string;
  updatedAt: string;
  status: string;
};

function stageLabel(s: PipelineStage): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SellerLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [contactIntents, setContactIntents] = useState<SupplierContactIntentRow[]>([]);
  const [inboundInquiries, setInboundInquiries] = useState<InboundInquiryRow[]>([]);
  const [categoriesYouSell, setCategoriesYouSell] = useState<string[]>([]);
  const [industryCategory, setIndustryCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [intentNotesDraft, setIntentNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/leads", { credentials: "include" });
      if (!res.ok) {
        setError("Could not load leads. Sign in as a seller.");
        return;
      }
      const data = (await res.json()) as {
        leads?: LeadRow[];
        contactIntents?: SupplierContactIntentRow[];
        inboundInquiries?: InboundInquiryRow[];
        categoriesYouSell?: string[];
        industryCategory?: string;
      };
      setLeads(data.leads ?? []);
      const ci = data.contactIntents ?? [];
      setContactIntents(ci);
      const nd: Record<string, string> = {};
      for (const r of ci) {
        nd[r.id] = r.sellerNotes ?? "";
      }
      setIntentNotesDraft(nd);
      setInboundInquiries(data.inboundInquiries ?? []);
      setCategoriesYouSell(data.categoriesYouSell ?? []);
      setIndustryCategory(data.industryCategory ?? "");
      const drafts: Record<string, string> = {};
      for (const l of data.leads ?? []) {
        drafts[l.id] = l.disposition?.sellerNotes ?? "";
      }
      setNoteDrafts(drafts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchContactIntent = useCallback(async (intentId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/seller/supplier-buyer-intent/${intentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: unknown };
      alert(typeof err.error === "string" ? err.error : "Could not save.");
      return false;
    }
    await load();
    return true;
  }, [load]);

  const patchDisposition = useCallback(async (rfqId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/seller/leads/${rfqId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      alert(err.error ?? "Could not save.");
      return false;
    }
    await load();
    return true;
  }, [load]);

  const kpi = useMemo(() => {
    const counts: Record<PipelineStage, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      quoted: 0,
      converted: 0,
      lost: 0,
      other: 0,
    };
    for (const l of leads) {
      const s = (l.disposition?.pipelineStage ?? "new") as PipelineStage;
      if (counts[s] !== undefined) counts[s] += 1;
    }
    return counts;
  }, [leads]);

  const recentNew = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return leads.filter((l) => new Date(l.createdAt).getTime() >= weekAgo).length;
  }, [leads]);

  const columns = useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        header: "RFQ / product need",
        accessorKey: "productQuery",
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900">{row.original.productQuery}</span>
        ),
      },
      {
        header: "Qty · budget",
        accessorFn: (row) =>
          `${row.quantity} pcs · ${row.budget > 0 ? `${row.currency} ${row.budget}` : "—"}`,
      },
      {
        header: "Match",
        accessorKey: "matchScore",
      },
      {
        header: "Stage",
        cell: ({ row }) => {
          const id = row.original.id;
          const stage = (row.original.disposition?.pipelineStage ?? "new") as PipelineStage;
          return (
            <select
              value={stage}
              onChange={(e) =>
                void patchDisposition(id, { pipelineStage: e.target.value as PipelineStage })
              }
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        header: "Assignee",
        cell: ({ row }) => (
          <input
            defaultValue={row.original.disposition?.assignee ?? ""}
            placeholder="Who owns this?"
            key={`${row.original.id}-${row.original.disposition?.assignee ?? ""}`}
            onBlur={(e) => {
              const next = e.target.value.trim();
              const prev = row.original.disposition?.assignee ?? "";
              if (next !== prev) void patchDisposition(row.original.id, { assignee: next });
            }}
            className="w-full min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-900 outline-none focus:border-brand-500"
          />
        ),
      },
      {
        header: "Notes",
        cell: ({ row }) => {
          const id = row.original.id;
          return (
            <div className="flex max-w-[220px] flex-col gap-1">
              <textarea
                value={noteDrafts[id] ?? ""}
                onChange={(e) =>
                  setNoteDrafts((prev) => ({ ...prev, [id]: e.target.value }))
                }
                rows={2}
                placeholder="Internal notes…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() =>
                  void patchDisposition(id, { sellerNotes: noteDrafts[id] ?? "" })
                }
                className="self-start rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-600"
              >
                Save notes
              </button>
            </div>
          );
        },
      },
      {
        header: "Created",
        accessorFn: (row) => new Date(row.createdAt).toLocaleString(),
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Link
              href={`/search?q=${encodeURIComponent(row.original.productQuery)}`}
              className="text-xs font-bold text-brand-600 underline"
            >
              Search similar
            </Link>
            <Link href="/seller/inbox" className="text-xs font-bold text-slate-600 underline">
              Inbox
            </Link>
          </div>
        ),
      },
    ],
    [noteDrafts, patchDisposition],
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function summaryLine(l: LeadRow): string {
    const budgetPart = l.budget > 0 ? ` · Budget ~${l.currency} ${l.budget}` : "";
    return `${l.quantity} pcs${budgetPart} · ${new Date(l.createdAt).toLocaleDateString()}`;
  }

  return (
    <SellerPageShell
      title="Buyer demand & CRM"
      subtitle="Search chat actions (confirm order / ask callback) land in Contact supplier requests. Open RFQs from the marketplace appear below when keyword-matched to your catalog."
    >
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Your signals</p>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Industry:{" "}
          <span className="font-semibold text-slate-800">{industryCategory || "—"}</span>
        </p>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Catalog categories:{" "}
          {categoriesYouSell.length ? categoriesYouSell.join(", ") : "None yet"}
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">New (7d)</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{recentNew}</p>
        </div>
        {PIPELINE_STAGES.map((s) => (
          <div key={s} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {stageLabel(s)}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{kpi[s]}</p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm font-medium text-slate-500">Loading leads…</p>
      ) : null}

      {!loading && contactIntents.length > 0 ? (
        <section className="mb-12">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Contact supplier requests (search chat)
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Buyers who used Confirm order or Ask seller to contact back from search results. Order
            quantity, unit price, and currency are pre-filled using Gemini when{" "}
            <code className="rounded bg-slate-100 px-1 font-mono text-xs">GEMINI_API_KEY</code> is set;
            edit any field below.
          </p>
          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[2200px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Row
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Buyer
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Product
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Order qty (pcs)
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Unit price
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Curr.
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Outreach
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Owner
                  </th>
                  <th className="min-w-[160px] px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Seller notes
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    AI JSON
                  </th>
                  <th className="min-w-[220px] px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Summary
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Lang
                  </th>
                </tr>
              </thead>
              <tbody>
                {contactIntents.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top text-xs text-slate-700">
                      <span className="whitespace-nowrap">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </span>
                      {row.updatedAt && row.updatedAt !== row.createdAt ? (
                        <span className="mt-1 block text-[10px] text-slate-500">
                          Upd {new Date(row.updatedAt).toLocaleString()}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <select
                        value={row.status === "seen" ? "seen" : "new"}
                        onChange={(e) =>
                          void patchContactIntent(row.id, {
                            status: e.target.value as "new" | "seen",
                          })
                        }
                        className="max-w-[6rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-900"
                      >
                        <option value="new">New</option>
                        <option value="seen">Seen</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 align-top font-semibold text-slate-900">
                      {row.intentType === "order_confirm" ? "Confirm order" : "Callback"}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="font-semibold text-slate-900">{row.buyerName}</span>
                      <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {row.buyerKind === "guest" ? "Guest" : "Buyer"}
                      </span>
                    </td>
                    <td className="max-w-[120px] break-all px-3 py-3 align-top text-xs font-medium text-slate-700">
                      {row.email || "—"}
                    </td>
                    <td className="max-w-[100px] px-3 py-3 align-top text-xs font-medium text-slate-700">
                      {row.phone || "—"}
                    </td>
                    <td className="max-w-[160px] px-3 py-3 align-top">
                      <Link
                        href={`/product/${row.productId}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {row.productName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        key={`oq-${row.id}-${row.orderQuantity}-${row.updatedAt}`}
                        type="number"
                        min={1}
                        defaultValue={row.orderQuantity ?? ""}
                        placeholder={
                          row.searchQuantity != null ? `hint ${row.searchQuantity}` : "—"
                        }
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900"
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const n = raw === "" ? null : parseInt(raw, 10);
                          if (raw !== "" && !Number.isFinite(n)) return;
                          const prev = row.orderQuantity;
                          if (n === prev) return;
                          if (n === null && prev === null) return;
                          void patchContactIntent(row.id, { orderQuantity: n });
                        }}
                      />
                      {row.searchQuantity != null &&
                      row.orderQuantity != null &&
                      row.searchQuantity !== row.orderQuantity ? (
                        <span className="mt-1 block text-[10px] text-slate-500">
                          Search hint: {row.searchQuantity}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        key={`up-${row.id}-${row.unitPrice}-${row.updatedAt}`}
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={row.unitPrice ?? ""}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900"
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const n = raw === "" ? null : parseFloat(raw);
                          if (raw !== "" && !Number.isFinite(n)) return;
                          const prev = row.unitPrice;
                          if (n === prev) return;
                          if (n === null && prev === null) return;
                          void patchContactIntent(row.id, { unitPrice: n });
                        }}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        key={`cur-${row.id}-${row.priceCurrency}-${row.updatedAt}`}
                        type="text"
                        maxLength={12}
                        defaultValue={row.priceCurrency || ""}
                        placeholder="INR"
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold uppercase text-slate-900"
                        onBlur={(e) => {
                          const next = e.target.value.trim().slice(0, 12);
                          if (next === (row.priceCurrency || "")) return;
                          void patchContactIntent(row.id, { priceCurrency: next });
                        }}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <select
                        value={row.connectionStatus}
                        onChange={(e) =>
                          void patchContactIntent(row.id, {
                            connectionStatus: e.target.value as ConnectionStatus,
                          })
                        }
                        className="max-w-[11rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-900"
                      >
                        {CONNECTION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {CONNECTION_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        key={`own-${row.id}-${row.contactOwner}-${row.updatedAt}`}
                        type="text"
                        defaultValue={row.contactOwner}
                        placeholder="Who follows up?"
                        className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900"
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next === row.contactOwner) return;
                          void patchContactIntent(row.id, { contactOwner: next });
                        }}
                      />
                    </td>
                    <td className="min-w-[160px] px-3 py-3 align-top">
                      <textarea
                        value={intentNotesDraft[row.id] ?? ""}
                        onChange={(e) =>
                          setIntentNotesDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        rows={3}
                        placeholder="Internal notes…"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void patchContactIntent(row.id, {
                            sellerNotes: intentNotesDraft[row.id] ?? "",
                          })
                        }
                        className="mt-1 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold text-white hover:bg-brand-600"
                      >
                        Save notes
                      </button>
                    </td>
                    <td className="max-w-[180px] px-3 py-3 align-top">
                      <details className="text-xs">
                        <summary className="cursor-pointer font-bold text-brand-600">
                          View JSON
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[10px] text-emerald-100">
                          {JSON.stringify(row.structuredExtract, null, 2)}
                        </pre>
                      </details>
                    </td>
                    <td className="max-w-[280px] px-3 py-3 align-top">
                      <p className="line-clamp-4 whitespace-pre-wrap text-xs font-medium text-slate-700">
                        {row.summaryPreview}
                      </p>
                      {row.summaryFull.length > row.summaryPreview.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-bold text-brand-600">
                            Full summary
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">
                            {row.summaryFull}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top text-xs font-medium uppercase text-slate-600">
                      {row.replyLanguage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && leads.length === 0 && contactIntents.length === 0 && inboundInquiries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="font-semibold text-slate-800">No leads or chat requests yet.</p>
          <p className="mt-2 text-sm font-medium text-slate-600">
            When buyers submit RFQs or use Contact supplier from search, entries appear here. Add
            categories and tags so RFQs match your lane.
          </p>
          <Link
            href="/seller/products"
            className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            Edit catalog
          </Link>
        </div>
      ) : null}

      {!loading && leads.length > 0 ? (
        <section>
          <h2 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900">
            Matched open RFQs (marketplace)
          </h2>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[960px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="align-top px-4 py-3 text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>
      ) : !loading && leads.length === 0 && (contactIntents.length > 0 || inboundInquiries.length > 0) ? (
        <p className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          No open RFQs matched your catalog keywords right now. Matched RFQs appear in the table above
          when buyers post marketplace demand.
        </p>
      ) : null}

      {!loading && inboundInquiries.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Inbound inquiries (guests)
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Visitors who left product interest plus language — keyword-matched to your categories and
            tags like RFQs.
          </p>
          <ul className="mt-4 grid gap-3">
            {inboundInquiries.map((x) => (
              <li
                key={x.id}
                className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <p className="font-bold text-slate-900">{x.productInterest}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Lang: {x.preferredLanguage} · Score {x.matchScore} ·{" "}
                  {new Date(x.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && leads.length > 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick export
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {leads.slice(0, 5).map((l) => (
              <button
                key={l.id}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:border-brand-300"
                onClick={() =>
                  void navigator.clipboard.writeText(`${l.productQuery}\n${summaryLine(l)}`)
                }
              >
                Copy #{l.id.slice(-6)}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </SellerPageShell>
  );
}
