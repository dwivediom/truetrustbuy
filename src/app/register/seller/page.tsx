"use client";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { SELLER_INDUSTRY_OPTIONS, SELLER_LANGUAGE_OPTIONS } from "@/lib/constants/seller-onboarding";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

const STEPS = ["Account", "Business", "Contact", "AI setup"] as const;

export default function RegisterSellerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [industryCategory, setIndustryCategory] = useState<string>(SELLER_INDUSTRY_OPTIONS[0]);
  const [gstin, setGstin] = useState("");

  const [phone, setPhone] = useState("");
  const [phoneNotifyConsent, setPhoneNotifyConsent] = useState(true);

  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [agentMode, setAgentMode] = useState<"negotiate" | "faq_only">("negotiate");

  function next() {
    setError("");
    if (step === 0) {
      if (!email.includes("@")) {
        setError("Enter a valid work email.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    if (step === 1) {
      if (businessName.trim().length < 2) {
        setError("Enter your business name.");
        return;
      }
    }
    if (step === 2) {
      if (phone.trim().length < 8) {
        setError("Enter a mobile number buyers can reach.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/register/seller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        businessName: businessName.trim(),
        industryCategory,
        gstin: gstin.trim() || undefined,
        phone: phone.trim(),
        phoneNotifyConsent,
        preferredLanguage,
        agentMode,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string | { formErrors?: string[] } };

    if (!res.ok) {
      setLoading(false);
      if (typeof data.error === "string") {
        setError(data.error);
      } else if (data.error && typeof data.error === "object" && "formErrors" in data.error) {
        setError("Check highlighted fields and try again.");
      } else {
        setError("Could not create account. Try again or sign in if you already registered.");
      }
      return;
    }

    const sign = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (sign?.error) {
      setError("Account created. Sign in with your email and password.");
      router.push("/login");
      return;
    }
    router.push("/seller/dashboard");
    router.refresh();
  }

  return (
    <SiteChrome>
      <main className="mx-auto max-w-lg px-6 py-12 md:max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Manufacturer onboarding
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Join as Seller
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">
          Create your seller account, set how your AI assistant should behave, then build your catalog and
          pricing tiers.
        </p>

        <div className="mt-8 flex gap-2" aria-hidden>
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1">
              <div
                className={`h-1.5 rounded-full ${i <= step ? "bg-brand-600" : "bg-slate-200"}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {step === 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Work email &amp; password</h2>
              <p className="text-sm font-medium text-slate-600">
                Use an email your team checks—this is how you sign in. SMS OTP for mobile can be enabled by
                your workspace later; mobile is collected in the next steps for buyer callbacks.
              </p>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-700">
                  Work email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reg-pass" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reg-pass2" className="block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  id="reg-pass2"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Business identity</h2>
              <div>
                <label htmlFor="biz-name" className="block text-sm font-semibold text-slate-700">
                  Business / brand name
                </label>
                <input
                  id="biz-name"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Shree Glass Works"
                />
              </div>
              <div>
                <label htmlFor="industry" className="block text-sm font-semibold text-slate-700">
                  Industry category
                </label>
                <select
                  id="industry"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-500"
                  value={industryCategory}
                  onChange={(e) => setIndustryCategory(e.target.value)}
                >
                  {SELLER_INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="gstin" className="block text-sm font-semibold text-slate-700">
                  GSTIN (optional now, required for Trust badge)
                </label>
                <input
                  id="gstin"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-mono outline-none focus:border-brand-500"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Contact number</h2>
              <p className="text-sm font-medium text-slate-600">
                Buyers and our team may use this for urgent clarifications. Standard messaging rates may
                apply when SMS or WhatsApp is connected to your account.
              </p>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
                  Mobile number
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={phoneNotifyConsent}
                  onChange={(e) => setPhoneNotifyConsent(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">
                  I agree to receive operational messages about leads and verification on this number.
                </span>
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">AI assistant setup</h2>
              <p className="text-sm font-medium text-slate-600">
                This sets the default tone for your virtual front desk. You can refine instructions anytime
                in Settings.
              </p>
              <div>
                <label htmlFor="lang" className="block text-sm font-semibold text-slate-700">
                  Primary selling language
                </label>
                <select
                  id="lang"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-500"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                >
                  {SELLER_LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-slate-700">How should the AI help buyers?</legend>
                <label className="flex cursor-pointer gap-3 rounded-xl border-2 border-slate-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50">
                  <input
                    type="radio"
                    name="agentMode"
                    className="mt-1"
                    checked={agentMode === "negotiate"}
                    onChange={() => setAgentMode("negotiate")}
                  />
                  <span>
                    <span className="font-bold text-slate-900">Assist with deals</span>
                    <span className="mt-1 block text-sm font-medium text-slate-600">
                      Explain tiers, MOQ, and volume fit. Still escalates formal orders to you.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-xl border-2 border-slate-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50">
                  <input
                    type="radio"
                    name="agentMode"
                    className="mt-1"
                    checked={agentMode === "faq_only"}
                    onChange={() => setAgentMode("faq_only")}
                  />
                  <span>
                    <span className="font-bold text-slate-900">FAQs only</span>
                    <span className="mt-1 block text-sm font-medium text-slate-600">
                      Answer factual questions only. Commercial terms stay with you.
                    </span>
                  </span>
                </label>
              </fieldset>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={back}
                className="rounded-full border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-800 hover:border-brand-300"
              >
                Back
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create account & go to dashboard"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-sm font-medium text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </SiteChrome>
  );
}
