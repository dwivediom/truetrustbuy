/**
 * Imports Apex Industrial Polymers seller + catalog into MongoDB (User, Organization, Product, PricingRule).
 *
 * Maps your JSON shape to our schema:
 * - seller_profile → User (seller) + sellerProfile Mixed + Organization
 * - catalog[] → Product (metadata.externalSku, metadata.catalogMeta) + PricingRule tiers
 *
 * Usage: MONGO_URI=... APEX_IMPORT_PASSWORD='YourSecurePass' npx tsx scripts/seed-apex-polymers.ts
 */
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { OrganizationModel } from "../src/lib/models/Organization";
import { PricingRuleModel } from "../src/lib/models/PricingRule";
import { ProductModel } from "../src/lib/models/Product";
import { UserModel } from "../src/lib/models/User";
import { createEmbedding } from "../src/lib/search/embeddings";

const IMPORT_JSON = {
  seller_profile: {
    seller_id: "MFG-PLAS-552",
    business_name: "Apex Industrial Polymers",
    owner_name: "Rajesh Mehta",
    email: "logistics@apexpolymers.in",
    location: {
      city: "Ahmedabad",
      state: "Gujarat",
      address: "GIDC Industrial Estate, Vatva",
    },
    profile_image:
      "https://images.unsplash.com/photo-1530124564312-6f76c745bdac?q=80&w=400&h=400&fit=crop",
    verification_level: "Verified Gold",
    preferred_language: "Gujarati",
  },
  catalog: [
    {
      product_id: "AP-CAN-5L",
      name: "5 Litre HDPE Jerry Can (Heavy Duty)",
      image_url:
        "https://images.unsplash.com/photo-1595053800673-455938f451b6?q=80&w=600&h=600&fit=crop",
      category: "Industrial Packaging",
      material: "High-Density Polyethylene",
      specifications: {
        weight: "250g",
        color: "Milky White",
        neck_size: "32mm",
      },
      moq_rules: {
        minimum_order: 1000,
        unit: "pieces",
        moq_explanation: "Minimum run for custom colors is 5,000 units.",
      },
      pricing_tiers: [
        { min_qty: 1000, max_qty: 4999, price_per_unit: 42.0 },
        { min_qty: 5000, max_qty: 19999, price_per_unit: 38.5 },
        { min_qty: 20000, max_qty: 100000, price_per_unit: 34.0 },
      ],
      delivery_info: {
        dispatch_time: "3 days for stock white",
        production_lead_time: "12 days for bulk orders",
        shipping_terms: "Ex-factory Ahmedabad",
      },
    },
    {
      product_id: "AP-BOT-1L",
      name: "1 Litre Round Agro-Chemical Bottle",
      image_url:
        "https://images.unsplash.com/photo-1626245914652-32b507f3521b?q=80&w=600&h=600&fit=crop",
      category: "Agriculture Packaging",
      material: "HDPE with Fluorination",
      moq_rules: {
        minimum_order: 2000,
        unit: "pieces",
      },
      pricing_tiers: [
        { min_qty: 2000, max_qty: 10000, price_per_unit: 18.25 },
        { min_qty: 10001, max_qty: 50000, price_per_unit: 16.5 },
      ],
      delivery_info: {
        dispatch_time: "5 days",
        production_lead_time: "15 days",
        note: "Induction sealing wads included in price.",
      },
    },
    {
      product_id: "AP-DRM-200L",
      name: "200 Litre Blue Plastic Drum",
      image_url:
        "https://images.unsplash.com/photo-1618519764620-7403abdbbe9d?q=80&w=600&h=600&fit=crop",
      category: "Bulk Storage",
      material: "HM-HDPE",
      moq_rules: {
        minimum_order: 50,
        unit: "barrels",
      },
      pricing_tiers: [
        { min_qty: 50, max_qty: 199, price_per_unit: 1450.0 },
        { min_qty: 200, max_qty: 1000, price_per_unit: 1320.0 },
      ],
      delivery_info: {
        dispatch_time: "Next day (Stock dependent)",
        shipping_terms: "Loading charges extra",
      },
    },
  ],
} as const;

/** Map human language labels to our BCP primary tags where possible. */
function langTag(label: string): string {
  const l = label.trim().toLowerCase();
  if (l.includes("gujarati")) return "gu";
  if (l.includes("hindi")) return "hi";
  return "en";
}

function addrLine(loc: { city: string; state: string; address: string }): string {
  return [loc.address, loc.city, loc.state].filter(Boolean).join(", ");
}

type CatalogRow = (typeof IMPORT_JSON.catalog)[number];

function buildDescription(row: CatalogRow): string {
  const parts: string[] = [];
  parts.push(`${row.name}. Material: ${row.material}.`);
  if ("specifications" in row && row.specifications && typeof row.specifications === "object") {
    parts.push(`Specifications: ${JSON.stringify(row.specifications)}.`);
  }
  if (row.moq_rules) {
    parts.push(
      `MOQ: ${row.moq_rules.minimum_order} ${row.moq_rules.unit}.${"moq_explanation" in row.moq_rules && row.moq_rules.moq_explanation ? ` ${row.moq_rules.moq_explanation}` : ""}`,
    );
  }
  if (row.delivery_info) {
    parts.push(`Delivery: ${JSON.stringify(row.delivery_info)}.`);
  }
  parts.push(`Category: ${row.category}. Suitable for hybrid search on TrueTrustBuy.`);
  return parts.join(" ").trim();
}

function tierMax(q: number): number | null {
  if (q >= 99999) return null;
  return q;
}

async function main() {
  const uri = process.env.MONGO_URI;
  const pass = process.env.APEX_IMPORT_PASSWORD ?? "ApexImport2026!";
  if (!uri) throw new Error("Set MONGO_URI");

  const sp = IMPORT_JSON.seller_profile;
  const email = sp.email.toLowerCase().trim();

  /** Must match `connectDb()` in `src/lib/db.ts` — otherwise login queries `truetrustbuy` while seed writes elsewhere. */
  await mongoose.connect(uri, { dbName: "truetrustbuy" });

  let org = await OrganizationModel.findOne({ name: sp.business_name });
  const addressLine = addrLine(sp.location);
  if (!org) {
    org = await OrganizationModel.create({
      name: sp.business_name,
      industryCategory: "Industrial packaging & polymers",
      accountType: "seller",
      gstin: "",
      isVerified: true,
      address: addressLine,
      city: sp.location.city,
      state: sp.location.state,
    });
    console.log("Created organization:", org.name);
  } else {
    await OrganizationModel.updateOne(
      { _id: org._id },
      {
        $set: {
          address: addressLine,
          city: sp.location.city,
          state: sp.location.state,
          industryCategory: org.industryCategory || "Industrial packaging & polymers",
          isVerified: true,
        },
      },
    );
    console.log("Updated organization:", org.name);
  }

  const passwordHash = await hash(pass, 12);
  const sellerProfile = {
    sellerCode: sp.seller_id,
    businessName: sp.business_name,
    ownerName: sp.owner_name,
    profileImageUrl: sp.profile_image,
    verificationLevel: sp.verification_level,
    location: sp.location,
    preferredLanguageLabel: sp.preferred_language,
  };

  let user = await UserModel.findOne({ email });
  const orgIdStr = String(org._id);

  if (!user) {
    user = await UserModel.create({
      email,
      passwordHash,
      role: "seller",
      name: sp.owner_name,
      industryCategory: "Industrial packaging & polymers",
      gstin: "",
      orgId: orgIdStr,
      preferredLanguage: langTag(sp.preferred_language),
      sellerProfile,
    });
    console.log("Created seller user:", email, "/ password:", pass);
  } else {
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          role: "seller",
          name: sp.owner_name,
          orgId: orgIdStr,
          preferredLanguage: langTag(sp.preferred_language),
          sellerProfile,
        },
      },
    );
    user = await UserModel.findById(user._id);
    console.log("Updated seller user:", email, "/ password:", pass);
  }

  const sellerUserId = String(user!._id);

  for (const row of IMPORT_JSON.catalog) {
    const description = buildDescription(row);
    const embedding = await createEmbedding(`${row.name} ${description} ${row.category}`);
    const listPrice = row.pricing_tiers[0]?.price_per_unit ?? 0;
    const moq = row.moq_rules.minimum_order;

    const catalogMeta = {
      productId: row.product_id,
      material: row.material,
      specifications: "specifications" in row ? row.specifications : undefined,
      moq_rules: row.moq_rules,
      delivery_info: row.delivery_info,
    };

    const existing = await ProductModel.findOne({
      "metadata.sellerOrgId": sellerUserId,
      "metadata.externalSku": row.product_id,
    }).select("_id");

    const productPayload = {
      name: row.name,
      description,
      category: row.category,
      tags: [row.material, row.category, row.product_id].map((s) => s.slice(0, 64)),
      useCases: ["B2B bulk supply", "industrial buyers"],
      customizationAvailable: true,
      images: [row.image_url],
      pricing: {
        amount: listPrice,
        currency: "INR",
        billingPeriod: "one_time" as const,
      },
      metadata: {
        website: "",
        source: "import-apex-polymers",
        sellerOrgId: sellerUserId,
        externalSku: row.product_id,
        catalogMeta,
      },
      embedding,
    };

    let productId: string;
    if (existing) {
      await ProductModel.updateOne({ _id: existing._id }, { $set: productPayload });
      productId = String(existing._id);
      console.log("  Updated SKU:", row.product_id);
    } else {
      const created = await ProductModel.create(productPayload);
      productId = String(created._id);
      console.log("  Created SKU:", row.product_id);
    }

    const tiers = row.pricing_tiers.map((t) => ({
      minQty: t.min_qty,
      maxQty: tierMax(t.max_qty),
      unitPrice: t.price_per_unit,
    }));

    await PricingRuleModel.deleteMany({ productId });
    await PricingRuleModel.create({
      sellerUserId,
      productId,
      currency: "INR",
      moq,
      tiers,
    });
    console.log("    PricingRule MOQ", moq, "tiers:", tiers.length);
  }

  console.log("\nDone. Login as seller:");
  console.log("  ", email);
  console.log("  ", pass);
  console.log("Public storefront:", `/seller/${sellerUserId}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
