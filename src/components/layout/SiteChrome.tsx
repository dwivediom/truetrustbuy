"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";

/** Shared header + page background for app routes (not the marketing homepage). */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            TrueTrust<span className="text-brand-600">Buy</span>
          </Link>
          <nav
            className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm font-semibold text-slate-600 sm:gap-x-5"
            aria-label="Primary"
          >
            <Link href="/search" className="transition-colors hover:text-brand-600">
              Search
            </Link>
            <Link href="/categories" className="hidden transition-colors hover:text-brand-600 sm:inline">
              Categories
            </Link>
            {status === "loading" ? (
              <span className="text-slate-400">…</span>
            ) : session?.user ? (
              <>
                {session.user.role === "seller" ? (
                  <Link href="/seller/dashboard" className="transition-colors hover:text-brand-600">
                    Dashboard
                  </Link>
                ) : session.user.role === "admin" ? (
                  <Link href="/admin" className="transition-colors hover:text-brand-600">
                    Admin
                  </Link>
                ) : (
                  <Link href="/buyer/dashboard" className="transition-colors hover:text-brand-600">
                    Dashboard
                  </Link>
                )}
                <span className="hidden max-w-[10rem] truncate text-xs font-medium text-slate-500 sm:inline">
                  {session.user.name ?? session.user.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-800 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="transition-colors hover:text-brand-600">
                  Sign in
                </Link>
                <Link
                  href="/register/seller"
                  className="rounded-full bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-brand-600"
                >
                  List factory
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
