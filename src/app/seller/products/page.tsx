"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import {
  ChevronRight,
  IndianRupee,
  MessageSquare,
  Package,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type TierRow = { minQty: number; maxQty: number | null; unitPrice: number };

type RuleRow = {
  _id: string;
  productId: string;
  currency: string;
  moq: number;
  tiers: TierRow[];
};

type ProductRow = {
  _id: string;
  name: string;
  category: string;
  description?: string;
  images?: string[];
  tags?: string[];
  useCases?: string[];
  customizationAvailable?: boolean;
  pricing?: { amount: number; currency: string; billingPeriod?: string };
  metadata?: { website?: string; source?: string };
};

type EditDraft = {
  name: string;
  description: string;
  category: string;
  tagsStr: string;
  useCasesStr: string;
  customizationAvailable: boolean;
  amount: string;
  currency: string;
  billingPeriod: "month" | "year" | "one_time";
  website: string;
};

function splitList(input: string): string[] {
  return input
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One https URL per line or comma-separated; max 8 for catalog. */
function splitPhotoUrls(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//i.test(s))
    .slice(0, 8);
}

function tierLabel(min: number, max: number | null): string {
  if (max == null) return `≥ ${min} pcs`;
  return `${min} – ${max} pcs`;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [useCasesStr, setUseCasesStr] = useState("");
  const [customizationAvailable, setCustomizationAvailable] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year" | "one_time">("one_time");
  const [website, setWebsite] = useState("");
  const [photoUrlsCreate, setPhotoUrlsCreate] = useState("");
  const [photoDraftByProduct, setPhotoDraftByProduct] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const ruleByProduct = useMemo(() => new Map(rules.map((r) => [r.productId, r])), [rules]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, rRes] = await Promise.all([
        fetch("/api/seller/products", { credentials: "include" }),
        fetch("/api/seller/pricing-rules", { credentials: "include" }),
      ]);
      if (!pRes.ok) {
        setError("Could not load catalog. Sign in as a seller.");
        return;
      }
      const pData = (await pRes.json()) as { products?: ProductRow[] };
      const plist = pData.products ?? [];
      setProducts(plist);
      const photoMap: Record<string, string> = {};
      for (const p of plist) {
        photoMap[p._id] = (p.images ?? []).join("\n");
      }
      setPhotoDraftByProduct(photoMap);
      if (rRes.ok) {
        const rData = (await rRes.json()) as { rules?: RuleRow[] };
        setRules(rData.rules ?? []);
      } else {
        setRules([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < 0) {
        setError("Enter a valid list price.");
        return;
      }
      const imgs = splitPhotoUrls(photoUrlsCreate);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        tags: splitList(tagsStr),
        useCases: splitList(useCasesStr),
        customizationAvailable,
        ...(imgs.length > 0 ? { images: imgs } : {}),
        pricing: {
          amount: amt,
          currency: currency.trim() || "INR",
          billingPeriod,
        },
        metadata: {
          website: website.trim(),
          source: "manual",
        },
      };

      const res = await fetch("/api/seller/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: unknown; details?: unknown };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error ?? data.details ?? "Create failed");
        setError(msg);
        return;
      }
      setName("");
      setDescription("");
      setCategory("");
      setTagsStr("");
      setUseCasesStr("");
      setCustomizationAvailable(false);
      setAmount("");
      setWebsite("");
      setPhotoUrlsCreate("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProductPhotos(productId: string) {
    const raw = photoDraftByProduct[productId] ?? "";
    const images = splitPhotoUrls(raw);
    setError("");
    const res = await fetch(`/api/seller/products/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: unknown };
    if (!res.ok) {
      const msg =
        typeof data.error === "object"
          ? "Invalid photo URLs — use full https links (one per line)."
          : typeof data.error === "string"
            ? data.error
            : "Could not save photos.";
      setError(msg);
      return;
    }
    await load();
  }

  function startEdit(p: ProductRow) {
    setEditingId(p._id);
    setEditDraft({
      name: p.name,
      description: (p.description ?? "").trim(),
      category: p.category,
      tagsStr: (p.tags ?? []).join(", "),
      useCasesStr: (p.useCases ?? []).join(", "),
      customizationAvailable: p.customizationAvailable ?? false,
      amount: p.pricing?.amount != null ? String(p.pricing.amount) : "",
      currency: p.pricing?.currency ?? "INR",
      billingPeriod:
        (p.pricing?.billingPeriod as EditDraft["billingPeriod"]) ?? "one_time",
      website: (p.metadata?.website ?? "").trim(),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(productId: string) {
    if (!editDraft) return;
    setEditSubmitting(true);
    setError("");
    try {
      const amt = Number(editDraft.amount);
      if (!editDraft.description.trim() || editDraft.description.trim().length < 10) {
        setError("Description must be at least 10 characters.");
        return;
      }
      if (!Number.isFinite(amt) || amt < 0) {
        setError("Enter a valid list price.");
        return;
      }
      const imgs = splitPhotoUrls(photoDraftByProduct[productId] ?? "");
      const payload = {
        name: editDraft.name.trim(),
        description: editDraft.description.trim(),
        category: editDraft.category.trim(),
        tags: splitList(editDraft.tagsStr),
        useCases: splitList(editDraft.useCasesStr),
        customizationAvailable: editDraft.customizationAvailable,
        images: imgs,
        pricing: {
          amount: amt,
          currency: editDraft.currency.trim() || "INR",
          billingPeriod: editDraft.billingPeriod,
        },
        metadata: {
          website: editDraft.website.trim(),
          source: "manual",
        },
      };

      const res = await fetch(`/api/seller/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; details?: unknown };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error ?? data.details ?? "Update failed");
        setError(msg);
        return;
      }
      cancelEdit();
      await load();
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteProduct(id: string, label: string) {
    if (!confirm(`Remove “${label}” from your catalog? Pricing rules for this SKU are deleted too.`)) return;
    setError("");
    const res = await fetch(`/api/seller/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok && res.status !== 204) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <SellerPageShell
      title="Products"
      subtitle="Listings power hybrid search embeddings and buyer-facing product pages."
    >
      {error ? (
        <p className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your catalog</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Cards show list price and tiered MOQ when you&apos;ve saved rules under{" "}
              <Link href="/seller/pricing-rules" className="font-semibold text-brand-600 hover:underline">
                Tiered pricing
              </Link>
              .
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-sm font-medium text-slate-500">Loading…</p>
        ) : products.length === 0 ? (
          <p className="mt-8 text-sm font-medium text-slate-600">No products yet — add one below.</p>
        ) : (
          <ul className="mt-8 space-y-6">
            {products.map((p) => {
              const id = String(p._id);
              const rule = ruleByProduct.get(id);
              const tiers = rule?.tiers ?? [];
              const moq = rule?.moq ?? null;
              const cur = rule?.currency ?? p.pricing?.currency ?? "INR";
              const chips = [...(p.tags ?? []).slice(0, 6), ...(p.useCases ?? []).slice(0, 2)];

              return (
                <li
                  key={id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row">
                    <div
                      className={`relative shrink-0 overflow-hidden border-b border-slate-100 md:w-64 md:border-b-0 md:border-r md:border-slate-100 ${
                        p.images?.[0]
                          ? "h-52 md:h-[280px]"
                          : "flex h-52 flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 md:h-auto md:min-h-[280px]"
                      }`}
                    >
                      {p.images?.[0] ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.images[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-10 text-center text-[10px] font-bold uppercase tracking-wide text-white">
                            {p.category}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-200/80 shadow-sm">
                            <Package className="h-10 w-10 text-slate-400" aria-hidden />
                          </div>
                          <p className="mt-3 max-w-[12rem] text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {p.category}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold tracking-tight text-slate-900">{p.name}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80">
                              <Sparkles className="h-3 w-3 text-brand-600" aria-hidden />
                              Search indexed
                            </span>
                            {p.customizationAvailable ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
                                <ShieldCheck className="h-3 w-3" aria-hidden />
                                Customization
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Pricing strip */}
                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                              <Package className="h-3 w-3" aria-hidden />
                              MOQ
                            </p>
                            <p className="font-bold text-slate-900">
                              {moq != null ? `${moq} pcs` : <span className="text-slate-400">Set in tiers</span>}
                            </p>
                          </div>

                          {tiers.length > 0 ? (
                            tiers.slice(0, 3).map((tier, idx) => (
                              <div key={`${tier.minQty}-${idx}`}>
                                <p className="mb-1 text-xs font-semibold text-slate-500">
                                  {tierLabel(tier.minQty, tier.maxQty ?? null)}
                                </p>
                                <p className="flex items-center font-bold text-slate-900">
                                  {cur === "INR" ? (
                                    <IndianRupee className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                                  ) : (
                                    <span className="mr-0.5 text-xs text-slate-600">{cur}</span>
                                  )}
                                  {tier.unitPrice.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                  <span className="ml-1 text-xs font-medium text-slate-500">/pc</span>
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 sm:col-span-3">
                              <p className="mb-1 text-xs font-semibold text-slate-500">List price (no tiers yet)</p>
                              <p className="flex items-center font-bold text-slate-900">
                                {cur === "INR" ? (
                                  <IndianRupee className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                                ) : (
                                  <span className="mr-0.5 text-xs">{cur}</span>
                                )}
                                {p.pricing?.amount != null
                                  ? p.pricing.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                  : "—"}
                                <span className="ml-1 text-xs font-medium text-slate-500">
                                  {p.pricing?.billingPeriod === "one_time" ? "/ unit" : ""}
                                </span>
                              </p>
                              <Link
                                href="/seller/pricing-rules"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                              >
                                Add quantity bands
                                <ChevronRight className="h-3 w-3" aria-hidden />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      {chips.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {chips.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {editingId === id && editDraft ? (
                        <div className="mt-6 space-y-4 rounded-3xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-wide text-brand-900">
                            Edit listing
                          </p>
                          <label className="block text-sm font-semibold text-slate-700">
                            Name
                            <input
                              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))
                              }
                            />
                          </label>
                          <label className="block text-sm font-semibold text-slate-700">
                            Description (min 10 characters)
                            <textarea
                              minLength={10}
                              className="mt-1 min-h-[100px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                              value={editDraft.description}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))
                              }
                            />
                          </label>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm font-semibold text-slate-700">
                              Category
                              <input
                                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                                value={editDraft.category}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, category: e.target.value } : d))
                                }
                              />
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                              Website (optional)
                              <input
                                type="url"
                                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                                value={editDraft.website}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, website: e.target.value } : d))
                                }
                                placeholder="https://…"
                              />
                            </label>
                          </div>
                          <label className="block text-sm font-semibold text-slate-700">
                            Tags (comma-separated)
                            <input
                              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                              value={editDraft.tagsStr}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, tagsStr: e.target.value } : d))
                              }
                            />
                          </label>
                          <label className="block text-sm font-semibold text-slate-700">
                            Use cases
                            <textarea
                              className="mt-1 min-h-[72px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                              value={editDraft.useCasesStr}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, useCasesStr: e.target.value } : d))
                              }
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={editDraft.customizationAvailable}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d ? { ...d, customizationAvailable: e.target.checked } : d,
                                )
                              }
                            />
                            Customization available
                          </label>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <label className="block text-sm font-semibold text-slate-700">
                              List price
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                                value={editDraft.amount}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, amount: e.target.value } : d))
                                }
                              />
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                              Currency
                              <select
                                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                                value={editDraft.currency}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, currency: e.target.value } : d))
                                }
                              >
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                              </select>
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                              Billing
                              <select
                                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                                value={editDraft.billingPeriod}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          billingPeriod: e.target.value as EditDraft["billingPeriod"],
                                        }
                                      : d,
                                  )
                                }
                              >
                                <option value="one_time">One-time / unit quote</option>
                                <option value="month">Per month</option>
                                <option value="year">Per year</option>
                              </select>
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-3 pt-2">
                            <button
                              type="button"
                              disabled={editSubmitting}
                              onClick={() => void saveEdit(id)}
                              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                            >
                              {editSubmitting ? "Saving…" : "Save listing"}
                            </button>
                            <button
                              type="button"
                              disabled={editSubmitting}
                              onClick={cancelEdit}
                              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="text-xs font-medium text-slate-600">
                            Quantity tiers and MOQ live under{" "}
                            <Link href="/seller/pricing-rules" className="font-bold text-brand-600 hover:underline">
                              Tiered pricing
                            </Link>
                            .
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                          Photos (https URLs)
                        </p>
                        <textarea
                          value={photoDraftByProduct[id] ?? ""}
                          onChange={(e) =>
                            setPhotoDraftByProduct((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                          rows={2}
                          placeholder="https://… (one per line — first shows on listings)"
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => void saveProductPhotos(id)}
                          className="mt-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          Save photos
                        </button>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-bold text-brand-900 transition hover:bg-brand-100 sm:flex-none"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit listing
                        </button>
                        <Link
                          href={`/product/${id}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 sm:flex-none"
                        >
                          <MessageSquare className="h-4 w-4" aria-hidden />
                          Preview listing
                        </Link>
                        <Link
                          href="/seller/chatbot-knowledge"
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:border-brand-300 hover:text-brand-700 sm:flex-none"
                        >
                          Knowledge base
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deleteProduct(id, p.name)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-800 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Add product</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Tags and description feed search relevance. Typical B2B SKUs use INR list price with one-time billing unless you&apos;re quoting SaaS-like terms.
        </p>

        <form onSubmit={(e) => void createProduct(e)} className="mt-8 grid gap-5">
          <label className="block text-sm font-semibold text-slate-700">
            Name
            <input
              required
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Description (min 10 characters)
            <textarea
              required
              minLength={10}
              className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Category
              <input
                required
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Website (optional)
              <input
                type="url"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Tags (comma-separated)
            <input
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="PET, pharma grade, amber"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Use cases (comma or newline separated)
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={useCasesStr}
              onChange={(e) => setUseCasesStr(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={customizationAvailable}
              onChange={(e) => setCustomizationAvailable(e.target.checked)}
            />
            Customization available (MOQ / tooling may apply)
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Product photos (optional)
            <textarea
              value={photoUrlsCreate}
              onChange={(e) => setPhotoUrlsCreate(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
              placeholder={
                "https://images.unsplash.com/photo-…\nhttps://placehold.co/800x600?text=SKU\n\nFull https URLs only; first image is the primary listing photo."
              }
            />
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Paste image links (Unsplash, your CDN, etc.). File upload can be added later — URLs work
              everywhere today.
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700">
              List price
              <input
                required
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Currency
              <select
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Billing
              <select
                className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
                value={billingPeriod}
                onChange={(e) =>
                  setBillingPeriod(e.target.value as "month" | "year" | "one_time")
                }
              >
                <option value="one_time">One-time / unit quote</option>
                <option value="month">Per month</option>
                <option value="year">Per year</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Create product"}
          </button>
        </form>
      </section>
    </SellerPageShell>
  );
}
