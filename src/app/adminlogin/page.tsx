"use client";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials.");
      return;
    }
    const session = await getSession();
    if (session?.user?.role !== "admin") {
      setError("This account is not an admin.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <SiteChrome>
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin sign in</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Restricted to users with role <span className="font-mono text-slate-800">admin</span>.
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="admin-email"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="admin-password"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Standard login
          </Link>
        </p>
      </main>
    </SiteChrome>
  );
}
