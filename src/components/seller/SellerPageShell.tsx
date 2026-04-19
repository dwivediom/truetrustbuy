"use client";

import { SiteChrome } from "@/components/layout/SiteChrome";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  /** Wider canvas for inbox-style layouts */
  wide?: boolean;
  children: React.ReactNode;
};

export function SellerPageShell({
  title,
  subtitle,
  backHref = "/seller/dashboard",
  wide,
  children,
}: Props) {
  const width = wide ? "max-w-6xl" : "max-w-5xl";
  return (
    <SiteChrome>
      <main className={`mx-auto ${width} px-6 py-12`}>
        <div className="mb-10">
          <Link
            href={backHref}
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </main>
    </SiteChrome>
  );
}
