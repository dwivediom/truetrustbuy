import { auth, signOut } from "@/auth";
import AdminProductForm from "@/components/admin/AdminProductForm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/adminlogin");
  if (session.user.role !== "admin") redirect("/");

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="rounded-lg border border-zinc-300 px-3 py-2">Logout</button>
        </form>
      </div>
      <div className="flex gap-4 text-sm">
        <Link href="/admin/import" className="underline">
          Go to bulk import
        </Link>
      </div>
      <AdminProductForm />
    </main>
  );
}
