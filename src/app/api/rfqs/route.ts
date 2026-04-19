import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { RFQModel } from "@/lib/models/RFQ";

export async function GET() {
  const access = await requireRole(["buyer", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const rfqs = await RFQModel.find({
    buyerUserId: access.role === "buyer" ? access.session.user.id : { $exists: true },
  })
    .sort({ createdAt: -1 })
    .lean();
  return Response.json({ rfqs });
}

export async function POST(request: Request) {
  const access = await requireRole(["buyer", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = (await request.json()) as {
    productQuery: string;
    quantity?: number;
    budget?: number;
    currency?: string;
  };
  if (!body.productQuery) {
    return Response.json({ error: "productQuery is required" }, { status: 400 });
  }
  const rfq = await RFQModel.create({
    buyerUserId: access.session.user.id,
    productQuery: body.productQuery,
    quantity: body.quantity ?? 1,
    budget: body.budget ?? 0,
    currency: body.currency ?? "INR",
  });
  return Response.json({ rfq }, { status: 201 });
}

