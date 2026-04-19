import { auth } from "@/auth";
import { connectDb } from "@/lib/db";
import { BuyerIntakeModel } from "@/lib/models/BuyerIntake";
import { UserModel } from "@/lib/models/User";
import { ensureGuestToken } from "@/lib/buyer-intake-cookie";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const presetUnion = z.union([
  z.enum(["en", "hi", "zh", "ja", "fr", "es", "other"]),
  z.string().min(2).max(16),
]);

const languageOnlySchema = z.object({
  languageOnly: z.literal(true),
  preferredLanguage: presetUnion,
  customLanguage: z.string().max(100).optional().default(""),
});

const intakeFullSchema = z.object({
  preferredLanguage: presetUnion,
  customLanguage: z.string().max(100).optional().default(""),
  contactEmail: z.union([z.string().email(), z.literal("")]).default(""),
  contactPhone: z.string().max(32).default(""),
  productInterest: z.string().max(500).default(""),
  marketingConsent: z.boolean().default(false),
});

function resolveLang(data: {
  preferredLanguage: string;
  customLanguage: string;
}): string {
  let lang = data.preferredLanguage;
  if (lang === "other") {
    lang = data.customLanguage.trim().slice(0, 16) || "en";
  }
  return lang;
}

export async function GET() {
  await connectDb();
  const { token } = await ensureGuestToken();
  const doc = await BuyerIntakeModel.findOne({ guestToken: token }).lean<{
    preferredLanguage?: string;
    customLanguage?: string;
    contactEmail?: string;
    contactPhone?: string;
    productInterest?: string;
    marketingConsent?: boolean;
    explicitLanguageAt?: Date | null;
    updatedAt?: Date;
  } | null>();

  const session = await auth();
  let userLanguageExplicitAt: string | null = null;
  if (session?.user?.role === "buyer") {
    const u = await UserModel.findById(session.user.id)
      .select("languageExplicitAt")
      .lean<{ languageExplicitAt?: Date | null } | null>();
    userLanguageExplicitAt = u?.languageExplicitAt?.toISOString() ?? null;
  }

  return Response.json({
    guestToken: token,
    userLanguageExplicitAt,
    intake: doc
      ? {
          preferredLanguage: doc.preferredLanguage ?? "en",
          customLanguage: doc.customLanguage ?? "",
          contactEmail: doc.contactEmail ?? "",
          contactPhone: doc.contactPhone ?? "",
          productInterest: doc.productInterest ?? "",
          marketingConsent: Boolean(doc.marketingConsent),
          explicitLanguageAt: doc.explicitLanguageAt?.toISOString() ?? null,
          updatedAt: doc.updatedAt?.toISOString(),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limited = rateLimit(`buyer-intake:${ip}`, 40, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests", retryAfterSec: limited.retryAfterSec },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const now = new Date();

  await connectDb();
  const { token } = await ensureGuestToken();

  if (raw.languageOnly === true) {
    const parsed = languageOnlySchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    const lang = resolveLang(parsed.data);
    await BuyerIntakeModel.findOneAndUpdate(
      { guestToken: token },
      {
        $set: {
          preferredLanguage: lang,
          customLanguage: parsed.data.customLanguage.trim().slice(0, 100),
          explicitLanguageAt: now,
        },
      },
      { upsert: true, new: true },
    );
  } else {
    const parsed = intakeFullSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    const lang = resolveLang(parsed.data);
    await BuyerIntakeModel.findOneAndUpdate(
      { guestToken: token },
      {
        $set: {
          preferredLanguage: lang,
          customLanguage: parsed.data.customLanguage.trim().slice(0, 100),
          contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
          contactPhone: parsed.data.contactPhone.trim(),
          productInterest: parsed.data.productInterest.trim(),
          marketingConsent: parsed.data.marketingConsent,
          explicitLanguageAt: now,
        },
      },
      { upsert: true, new: true },
    );
  }

  const fresh = await BuyerIntakeModel.findOne({ guestToken: token }).lean<{
    preferredLanguage?: string;
    customLanguage?: string;
    contactEmail?: string;
    contactPhone?: string;
    productInterest?: string;
    marketingConsent?: boolean;
    explicitLanguageAt?: Date | null;
    updatedAt?: Date;
  } | null>();

  return Response.json({
    ok: true,
    guestToken: token,
    intake: fresh
      ? {
          preferredLanguage: fresh.preferredLanguage ?? "en",
          customLanguage: fresh.customLanguage ?? "",
          contactEmail: fresh.contactEmail ?? "",
          contactPhone: fresh.contactPhone ?? "",
          productInterest: fresh.productInterest ?? "",
          marketingConsent: Boolean(fresh.marketingConsent),
          explicitLanguageAt: fresh.explicitLanguageAt?.toISOString() ?? null,
          updatedAt: fresh.updatedAt?.toISOString(),
        }
      : null,
  });
}
