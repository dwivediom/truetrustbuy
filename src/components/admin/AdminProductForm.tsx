"use client";

import { useState } from "react";

const initial = {
  name: "",
  description: "",
  category: "",
  useCases: "",
  tags: "",
  amount: 0,
  billingPeriod: "month",
};

export default function AdminProductForm() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");
    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      useCases: form.useCases.split(",").map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      pricing: {
        amount: Number(form.amount),
        currency: "USD",
        billingPeriod: form.billingPeriod,
      },
      metadata: {
        source: "admin-form",
      },
    };
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      setMessage(`Error: ${JSON.stringify(err.error ?? err)}`);
      return;
    }
    setMessage("Product added.");
    setForm(initial);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Add Product (One by One)</h2>
      <input className="w-full rounded border p-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <textarea className="w-full rounded border p-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Use cases comma-separated" value={form.useCases} onChange={(e) => setForm({ ...form, useCases: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Tags comma-separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
      <div className="flex gap-2">
        <input className="w-full rounded border p-2" placeholder="Price" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        <select className="rounded border p-2" value={form.billingPeriod} onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}>
          <option value="month">month</option>
          <option value="year">year</option>
          <option value="one_time">one_time</option>
        </select>
      </div>
      <button className="rounded bg-zinc-900 px-4 py-2 text-white">Save</button>
      <p className="text-sm text-zinc-600">{message}</p>
    </form>
  );
}
