"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useCallback, useEffect, useState } from "react";

type Conversation = { _id: string; title?: string; productId: string; buyerUserId: string };

type ChatMessage = {
  _id: string;
  role: string;
  content: string;
  isAi?: boolean;
  createdAt?: string;
};

export default function SellerInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [handoffToHuman, setHandoffToHuman] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { conversations: Conversation[] };
    setConversations(data.conversations ?? []);
    setActiveId((prev) => prev || (data.conversations[0] ? String(data.conversations[0]._id) : ""));
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/conversations/${id}/messages?viewer=seller`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages: ChatMessage[];
      aiAssistantEnabled?: boolean;
      handoffToHuman?: boolean;
    };
    setMessages(data.messages ?? []);
    setAiAssistantEnabled(data.aiAssistantEnabled !== false);
    setHandoffToHuman(Boolean(data.handoffToHuman));
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

  async function send(e: React.FormEvent) {
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
    setError("");
    await loadMessages(activeId);
  }

  async function setAiEnabled(next: boolean) {
    if (!activeId) return;
    const res = await fetch(`/api/conversations/${activeId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiAssistantEnabled: next }),
    });
    if (res.ok) setAiAssistantEnabled(next);
  }

  return (
    <SellerPageShell
      wide
      title="Inbox"
      subtitle="Buyer messages are shown in your preferred language when possible (set under Settings)."
    >
      {error ? <p className="mb-3 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="px-2 text-xs font-bold uppercase text-slate-500">Threads</h2>
          <ul className="mt-2 space-y-1">
            {conversations.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => setActiveId(String(c._id))}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    activeId === String(c._id)
                      ? "bg-brand-50 font-semibold text-brand-900"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {c.title || "Thread"}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={aiAssistantEnabled}
                onChange={(e) => void setAiEnabled(e.target.checked)}
                disabled={!activeId || handoffToHuman}
              />
              AI assistant replies on this thread
            </label>
            {handoffToHuman ? (
              <span className="text-xs font-medium text-amber-800">Human handoff active</span>
            ) : null}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m._id}
                className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "seller"
                    ? "ml-auto bg-slate-900 text-white"
                    : m.role === "assistant"
                      ? "border border-brand-100 bg-brand-50 text-brand-950"
                      : m.role === "system"
                        ? "mx-auto bg-amber-50 text-amber-900"
                        : "bg-slate-100 text-slate-900"
                }`}
              >
                {m.isAi ? (
                  <span className="mb-1 block text-[10px] font-bold uppercase text-brand-700">AI</span>
                ) : null}
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply as manufacturer…"
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
    </SellerPageShell>
  );
}
