import { requireAdmin } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { hash } from "bcryptjs";

export async function POST(request: Request) {
  const secret = request.headers.get("x-seed-secret");
  if (!process.env.ADMIN_BOOTSTRAP_SECRET || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return Response.json({ error: "Invalid bootstrap secret" }, { status: 401 });
  }

  await connectDb();
  const { email, password, name } = await request.json();
  const exists = await UserModel.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (exists) {
    return Response.json({ message: "Admin already exists." });
  }
  const passwordHash = await hash(String(password), 12);
  const user = await UserModel.create({
    email: String(email).toLowerCase().trim(),
    passwordHash,
    role: "admin",
    name: String(name || "Admin"),
  });
  return Response.json({ adminId: String(user._id) });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  return Response.json({ ok: true });
}
