"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Conversation = {
  _id: string;
  title?: string;
  productId: string;
  sellerUserId: string;
  handoffToHuman?: boolean;
};

type ChatMessage = {
  _id: string;
  role: string;
  content: string;
  isAi?: boolean;
  displaySource?: string;
  createdAt?: string;
};

export default function BuyerChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [handoff, setHandoff] = useState(false);
  const [draft, setDraft] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { conversations: Conversation[] };
    const list = data.conversations ?? [];
    setConversations(list);
    setActiveId((prev) => prev || (list[0] ? String(list[0]._id) : ""));
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/conversations/${id}/messages?viewer=buyer`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[]; handoffToHuman: boolean };
    setMessages(data.messages ?? []);
    setHandoff(!!data.handoffToHuman);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadConversations();
    }, 0);
    return () => clearTimeout(t);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => {
      void loadMessages(activeId);
    }, 0);
    return () => clearTimeout(t);
  }, [activeId, loadMessages]);

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/conversations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: newProductId.trim() }),
    });
    const data = (await res.json()) as { error?: string; conversation?: Conversation };
    if (!res.ok) {
      setError(data.error ?? "Could not start thread");
      return;
    }
    if (data.conversation) {
      setActiveId(String(data.conversation._id));
      await loadConversations();
      setNewProductId("");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const res = await fetch(`/api/conversations/${activeId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.trim() }),
    });
    if (!res.ok) {
      setError("Send failed");
      return;
    }
    setDraft("");
    await loadMessages(activeId);
    await loadConversations();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Agent workspace</h1>
          <p className="mt-1 text-zinc-600">
            Chat suppliers with AI summaries. AI replies are labeled; orders and payments go to
            humans.
          </p>
        </div>
        <Link href="/buyer/dashboard" className="text-sm font-medium text-brand-600 hover:underline">
          Buyer dashboard
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={startConversation} className="mb-8 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-4">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Product ID to message supplier"
          value={newProductId}
          onChange={(e) => setNewProductId(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Open thread
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-zinc-200 bg-white p-3">
          <h2 className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Threads</h2>
          <ul className="mt-2 space-y-1">
            {conversations.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => setActiveId(String(c._id))}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    activeId === String(c._id)
                      ? "bg-brand-50 font-semibold text-brand-900"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {c.title || "Conversation"}
                  {c.handoffToHuman ? (
                    <span className="ml-1 text-xs text-amber-700">· human</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-[420px] flex-col rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-sm text-zinc-500">
              {handoff ? "Human handoff active — AI paused for negotiation milestones." : null}
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m._id}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "buyer"
                    ? "ml-auto bg-zinc-900 text-white"
                    : m.role === "assistant"
                      ? "bg-brand-50 text-brand-950 border border-brand-100"
                      : m.role === "system"
                        ? "mx-auto bg-amber-50 text-amber-950 border border-amber-100 text-center"
                        : "bg-zinc-100 text-zinc-900"
                }`}
              >
                {m.isAi ? (
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-brand-700">
                    AI
                  </span>
                ) : null}
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="border-t border-zinc-100 p-3 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Message the supplier…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!activeId}
            />
            <button
              type="submit"
              disabled={!activeId || !draft.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
