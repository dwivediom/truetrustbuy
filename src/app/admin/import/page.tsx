import { auth } from "@/auth";
import BulkImportForm from "@/components/admin/BulkImportForm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/adminlogin");
  if (session.user.role !== "admin") redirect("/");

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-12">
      <Link href="/admin" className="text-sm underline">
        Back to dashboard
      </Link>
      <BulkImportForm />
    </main>
  );
}
