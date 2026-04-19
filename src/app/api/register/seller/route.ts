import { connectDb } from "@/lib/db";
import { OrganizationModel } from "@/lib/models/Organization";
import { UserModel } from "@/lib/models/User";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSellerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(72),
  businessName: z.string().min(2).max(120),
  industryCategory: z.string().min(2).max(80),
  gstin: z.string().max(15).optional().transform((s) => s?.trim() ?? ""),
  phone: z.string().min(8).max(24),
  phoneNotifyConsent: z.boolean(),
  preferredLanguage: z.string().min(2).max(16),
  agentMode: z.enum(["negotiate", "faq_only"]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerSellerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const gstin = parsed.data.gstin.replace(/\s/g, "").toUpperCase();

  await connectDb();

  const existing = await UserModel.findOne({ email }).select("_id").lean();
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const org = await OrganizationModel.create({
    name: parsed.data.businessName.trim(),
    industryCategory: parsed.data.industryCategory.trim(),
    accountType: "seller",
    gstin: gstin || "",
    isVerified: false,
  });

  await UserModel.create({
    email,
    passwordHash,
    role: "seller",
    name: parsed.data.businessName.trim(),
    industryCategory: parsed.data.industryCategory.trim(),
    gstin: gstin || "",
    agentMode: parsed.data.agentMode,
    orgId: String(org._id),
    preferredLanguage: parsed.data.preferredLanguage.trim(),
    phone: parsed.data.phone.trim(),
    phoneNotifyConsent: parsed.data.phoneNotifyConsent,
    agentInstructions: "",
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Seller account created. You can sign in now.",
    },
    { status: 201 },
  );
}
