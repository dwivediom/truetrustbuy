import type { Metadata } from "next";

/** Child routes (`page.tsx`) own titles — avoid a layout default title that overrides `generateMetadata`. */
export const metadata: Metadata = {
  description: "Natural language B2B supplier discovery with editable constraints.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
