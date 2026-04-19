"use client";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function safeInternalPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeInternalPath(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    if (callbackUrl) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }
    await router.refresh();
    let role = "buyer";
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    if (sessionRes.ok) {
      const data = (await sessionRes.json()) as { user?: { role?: string } };
      role = data?.user?.role ?? "buyer";
    } else {
      const session = await getSession();
      role = session?.user?.role ?? "buyer";
    }
    if (role === "admin") router.push("/admin");
    else if (role === "seller") router.push("/seller/dashboard");
    else router.push("/search");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="mb-8 rounded-2xl border-2 border-brand-200 bg-brand-50/60 p-4 text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand-800">First time here?</p>
        <p className="mt-1 text-sm font-medium text-slate-700">
          New buyers: create an account, then you’ll land on your dashboard with saved threads and RFQs.
        </p>
        <Link
          href="/register/buyer"
          className="mt-3 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          Register as a buyer
        </Link>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Use your work email and password. Sellers, buyers, and admins share this page—you are routed to the
        right workspace after sign-in.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            id="email"
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-brand-500"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            id="password"
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-brand-500"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New manufacturer?{" "}
        <Link href="/register/seller" className="font-semibold text-brand-600 hover:underline">
          Create a seller account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-600">
        Buying only?{" "}
        <Link href="/register/buyer" className="font-semibold text-brand-600 hover:underline">
          Buyer registration
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <SiteChrome>
      <Suspense fallback={<main className="px-6 py-16 text-slate-600">Loading…</main>}>
        <LoginForm />
      </Suspense>
    </SiteChrome>
  );
}
