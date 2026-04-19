import { Suspense } from "react";
import { SearchView } from "./search-view";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-12 text-center text-sm font-medium text-slate-500">
          Loading search…
        </main>
      }
    >
      <SearchView />
    </Suspense>
  );
}
