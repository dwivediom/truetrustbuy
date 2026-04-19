import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { ConversationModel } from "@/lib/models/Conversation";
import { ProductModel } from "@/lib/models/Product";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string().min(1),
});

export async function GET() {
  const access = await requireRole(["buyer", "seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const uid = access.session.user.id;
  const filter =
    access.role === "seller"
      ? { sellerUserId: uid }
      : access.role === "admin"
        ? {}
        : { buyerUserId: uid };
  const conversations = await ConversationModel.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
  return Response.json({ conversations });
}

export async function POST(request: Request) {
  const access = await requireRole(["buyer", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await ProductModel.findById(parsed.data.productId).lean<{
    metadata?: { sellerOrgId?: string };
    name?: string;
  } | null>();
  const sellerUserId = product?.metadata?.sellerOrgId?.trim();
  if (!sellerUserId) {
    return Response.json({ error: "Product has no seller org id" }, { status: 400 });
  }

  const buyerUserId = access.session.user.id;
  let conv = await ConversationModel.findOne({
    buyerUserId,
    sellerUserId,
    productId: parsed.data.productId,
  });
  if (!conv) {
    try {
      conv = await ConversationModel.create({
        buyerUserId,
        sellerUserId,
        productId: parsed.data.productId,
        title: product?.name ?? "Supplier thread",
      });
    } catch {
      conv = await ConversationModel.findOne({
        buyerUserId,
        sellerUserId,
        productId: parsed.data.productId,
      });
    }
  }
  if (!conv) return Response.json({ error: "Could not create conversation" }, { status: 500 });
  return Response.json({ conversation: conv.toObject() }, { status: 201 });
}
