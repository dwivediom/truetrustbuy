import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplier search",
  description: "Natural language B2B supplier discovery with editable constraints.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
