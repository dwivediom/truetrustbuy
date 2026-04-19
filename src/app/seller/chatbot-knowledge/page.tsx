"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ProductOption = { _id: string; name: string };

export default function SellerChatbotKnowledgePage() {
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [question, setQuestion] = useState("What MOQ applies for 5000 units?");
  const [sandboxAnswer, setSandboxAnswer] = useState("");
  const [sandboxBusy, setSandboxBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/seller/products", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { products?: ProductOption[] };
    const list = data.products ?? [];
    setProducts(list);
    setProductId((prev) => prev || (list[0] ? String(list[0]._id) : ""));
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/seller/knowledge/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; chunks?: number; filename?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Upload failed");
        return;
      }
      setStatus(`Indexed ${data.chunks ?? 0} chunks from ${data.filename ?? "file"}.`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function runSandbox(e: React.FormEvent) {
    e.preventDefault();
    setSandboxBusy(true);
    setSandboxAnswer("");
    try {
      const res = await fetch("/api/seller/bot/respond", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, question: question.trim() }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        pricingMode?: string;
        knowledgeChunksUsed?: number;
      };
      if (!res.ok) {
        setSandboxAnswer(data.error ?? "Request failed");
        return;
      }
      const meta =
        typeof data.knowledgeChunksUsed === "number"
          ? `\n\n— ${data.knowledgeChunksUsed} knowledge chunk(s) · pricing: ${data.pricingMode ?? "unknown"}`
          : "";
      setSandboxAnswer((data.answer ?? "") + meta);
    } finally {
      setSandboxBusy(false);
    }
  }

  return (
    <SellerPageShell
      title="Chatbot knowledge"
      subtitle="Upload PDFs or text files so the AI can answer buyer questions about materials, certifications, and policies without inventing facts."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Upload brochure or spec (PDF or .txt, max 4MB)
          <input
            type="file"
            accept=".pdf,.txt,.md,text/plain"
            className="mt-2 block w-full text-sm"
            disabled={uploading}
            onChange={(ev) => void onFile(ev)}
          />
        </label>
        {uploading ? <p className="mt-3 text-sm font-medium text-slate-500">Processing…</p> : null}
        {status ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">{status}</p>
        ) : null}
      </div>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Test my agent</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Answers combine your uploaded documents with pricing context: tiered rules when set, otherwise the product&apos;s
          list price.{" "}
          <Link href="/seller/pricing-rules" className="font-semibold text-brand-600 underline">
            Optional MOQ tiers
          </Link>{" "}
          sharpen quotes.
        </p>

        <form onSubmit={(e) => void runSandbox(e)} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Product
            <select
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p._id} value={String(p._id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Buyer-style question
            <textarea
              required
              className="mt-1 min-h-[96px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={sandboxBusy || !productId}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {sandboxBusy ? "Running…" : "Run preview"}
          </button>
        </form>

        {sandboxAnswer ? (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-800">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview</p>
            <p className="mt-2 whitespace-pre-wrap">{sandboxAnswer}</p>
          </div>
        ) : null}
      </section>
    </SellerPageShell>
  );
}
