"use client";

import { CHOOSE_LANGUAGE_LINE, PRESET_LANGS, type PresetLang } from "@/components/buyer/buyer-intake-copy";
import { ChevronDown, ChevronUp, Globe2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import { useCallback, useEffect, useState } from "react";

const STORAGE_DONE = "ttb_buyer_intake_v1_done";

type IntakePayload = {
  preferredLanguage: string;
  customLanguage: string;
  contactEmail: string;
  contactPhone: string;
  productInterest: string;
  marketingConsent: boolean;
};

type ApiIntake = IntakePayload & { updatedAt?: string };

export function BuyerIntakeGate({ session }: { session: Session | null }) {
  /** Collapsed by default so search isn’t blocked before browsing (language/contact optional). */
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const [preset, setPreset] = useState<PresetLang | "other">("en");
  const [customLanguage, setCustomLanguage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [productInterest, setProductInterest] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_DONE) === "1") {
      setDone(true);
      setInstructionsOpen(true);
      setPanelOpen(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/buyer-intake", { credentials: "include" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { intake: ApiIntake | null };
      if (data.intake) {
        const pl = data.intake.preferredLanguage;
        const known = PRESET_LANGS.some((p) => p.code === pl);
        if (known) {
          setPreset(pl as PresetLang);
        } else if (pl && pl !== "other") {
          setPreset("other");
          setCustomLanguage(pl);
        }
        setContactEmail(data.intake.contactEmail ?? "");
        setContactPhone(data.intake.contactPhone ?? "");
        setProductInterest(data.intake.productInterest ?? "");
        setMarketingConsent(Boolean(data.intake.marketingConsent));
      }
    } catch {
      setError("Could not load preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(opts: { skipContact: boolean }) {
    setSubmitting(true);
    setError("");
    try {
      const body = {
        preferredLanguage: preset === "other" ? ("other" as const) : preset,
        customLanguage: preset === "other" ? customLanguage.trim() : "",
        contactEmail: opts.skipContact ? "" : contactEmail.trim(),
        contactPhone: opts.skipContact ? "" : contactPhone.trim(),
        productInterest: productInterest.trim(),
        marketingConsent,
      };

      const resolvedLang = preset === "other" ? customLanguage.trim().slice(0, 16) || "en" : preset;

      const res = await fetch("/api/public/buyer-intake", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: unknown };
        throw new Error(typeof err.error === "string" ? err.error : "Save failed");
      }

      if (session?.user) {
        const patchBody: Record<string, unknown> = {};
        if (resolvedLang.length >= 2) {
          patchBody.preferredLanguage = resolvedLang.slice(0, 16);
        }
        const phone = opts.skipContact ? "" : contactPhone.trim();
        if (phone) patchBody.phone = phone.slice(0, 24);
        if (Object.keys(patchBody).length > 0) {
          await fetch("/api/user/preferences", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patchBody),
          });
        }
        await fetch("/api/user/merge-guest-intake", {
          method: "POST",
          credentials: "include",
        });
      }

      if (productInterest.trim()) {
        sessionStorage.setItem("ttb_rfq_prefill", productInterest.trim());
      }

      localStorage.setItem(STORAGE_DONE, "1");
      setDone(true);
      setEditing(false);
      setInstructionsOpen(true); // show guidance after first confirm
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Loading preferences…</p>
      </div>
    );
  }

  if (!done && !panelOpen) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          <span className="font-semibold text-slate-900">Language & contact</span> — optional. Helps
          suppliers reach you and reply in your language.
        </p>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-brand-600"
        >
          Open
        </button>
      </div>
    );
  }

  if (done && !editing) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-emerald-950">
            Language & contact saved. Search below — chat with Jiya without signing in first (sign in
            later to continue longer threads).
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
          >
            Edit preferences
          </button>
        </div>
        <InstructionsPanel open={instructionsOpen} onToggle={() => setInstructionsOpen((o) => !o)} />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <Globe2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" aria-hidden />
        <div>
          <p className="text-lg font-extrabold tracking-tight text-slate-900">Before you search</p>
          <div className="mt-2 space-y-1 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
            {Object.entries(CHOOSE_LANGUAGE_LINE).map(([code, text]) => (
              <span key={code} className="mr-3 inline-block">
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESET_LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              setPreset(code);
              setCustomLanguage("");
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              preset === code
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset("other")}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            preset === "other"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300"
          }`}
        >
          Other
        </button>
      </div>

      {preset === "other" ? (
        <div className="mb-4">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Your language
          </label>
          <input
            value={customLanguage}
            onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="e.g. Deutsch, ਪੰਜਾਬੀ"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Email (optional)
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25"
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Phone (optional)
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25"
            placeholder="+91 …"
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          What are you looking for? (optional)
        </label>
        <input
          value={productInterest}
          onChange={(e) => setProductInterest(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25"
          placeholder="e.g. amber glass bottles 500ml MOQ 1000"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-600">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span>
          I agree that TrueTrustBuy and suppliers may contact me about this inquiry. See our privacy
          policy (coming soon).
        </span>
      </label>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit({ skipContact: false })}
          className="rounded-full bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit({ skipContact: true })}
          className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:border-brand-300 disabled:opacity-50"
        >
          Skip contact — language only (defaults to English where needed)
        </button>
        {done && editing ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setEditing(false)}
            className="rounded-full px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InstructionsPanel({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900"
      >
        How this works
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {open ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-medium text-slate-600">
          <li>
            Ask questions in natural language below. Open a product chat with Jiya — you can try a few
            messages without signing in; sign in later to continue and use RFQs.
          </li>
          <li>
            When you confirm above, we use your language preference (default English if skipped) and
            optional email/phone so suppliers can reach you about your interest.
          </li>
          <li>
            If the AI doesn&apos;t know something,{" "}
            <Link href="/rfq/new" className="font-bold text-brand-600 underline">
              submit an RFQ
            </Link>{" "}
            or raise a message to the seller from your chat thread after sign-in.
          </li>
        </ul>
      ) : null}
    </div>
  );
}
