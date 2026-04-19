"use client";

import { SellerPageShell } from "@/components/seller/SellerPageShell";
import { useEffect, useState } from "react";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "gu", label: "Gujarati" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
];

export default function SellerSettingsPage() {
  const [code, setCode] = useState("en");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneNotifyConsent, setPhoneNotifyConsent] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/seller/profile-bundle", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as {
          profile?: {
            preferredLanguage?: string;
            agentInstructions?: string;
            phone?: string;
            phoneNotifyConsent?: boolean;
          };
        };
        const p = data.profile;
        if (p?.preferredLanguage) setCode(p.preferredLanguage);
        if (typeof p?.agentInstructions === "string") setAgentInstructions(p.agentInstructions);
        if (typeof p?.phone === "string") setPhone(p.phone);
        if (typeof p?.phoneNotifyConsent === "boolean") setPhoneNotifyConsent(p.phoneNotifyConsent);
      }
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredLanguage: code,
        agentInstructions: agentInstructions.trim(),
        phone: phone.trim(),
        phoneNotifyConsent,
      }),
    });
    if (!res.ok) {
      setMsg("Could not save (sign in as seller).");
      return;
    }
    setMsg("Saved. Agent prompts and notifications use these values where applicable.");
  }

  return (
    <SellerPageShell title="Agent & language" subtitle="Fine-tune translation, instructions, and notification preferences.">
      {loading ? <p className="text-sm font-medium text-slate-500">Loading…</p> : null}
      <form onSubmit={save} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Preferred inbox language
          <select
            className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Agent instructions (prepended to every AI reply for your storefront)
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            value={agentInstructions}
            onChange={(e) => setAgentInstructions(e.target.value)}
            placeholder="We do not ship on Sundays. Mention Firozabad factory lead times when asked."
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Phone (optional, for escalation SMS / webhook integrations)
          <input
            type="tel"
            className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={phoneNotifyConsent}
            onChange={(e) => setPhoneNotifyConsent(e.target.checked)}
          />
          I consent to receive operational alerts for buyer escalations
        </label>
        <button
          type="submit"
          className="w-full rounded-2xl bg-slate-900 py-2 text-sm font-bold text-white hover:bg-brand-600"
        >
          Save
        </button>
        {msg ? <p className="text-sm font-medium text-slate-600">{msg}</p> : null}
      </form>
    </SellerPageShell>
  );
}
