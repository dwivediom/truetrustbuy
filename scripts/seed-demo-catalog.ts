/**
 * Seeds two demo seller accounts + products with photos (https placeholders) + tiered pricing.
 * Safe to re-run: skips sellers that already exist (by email); always inserts new products if you need,
 * delete duplicates manually — for dev, run once.
 *
 * Usage: MONGO_URI=... SEED_DEMO_PASSWORD='YourPass' npx tsx scripts/seed-demo-catalog.ts
 */
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { PricingRuleModel } from "../src/lib/models/PricingRule";
import { ProductModel } from "../src/lib/models/Product";
import { UserModel } from "../src/lib/models/User";
import { createEmbedding } from "../src/lib/search/embeddings";

const uri = process.env.MONGO_URI;
const PASS = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";

function ph(bg: string, fg: string, label: string): string {
  return `https://placehold.co/900x600/${bg}/${fg}?text=${encodeURIComponent(label)}`;
}

async function upsertSeller(email: string, name: string, industryCategory: string) {
  const normalized = email.toLowerCase().trim();
  let doc = await UserModel.findOne({ email: normalized });
  const passwordHash = await hash(PASS, 12);
  if (!doc) {
    doc = await UserModel.create({
      email: normalized,
      passwordHash,
      role: "seller",
      name,
      industryCategory,
      gstin: "",
    });
    console.log("Created seller:", normalized);
  } else {
    console.log("Seller already exists:", normalized);
  }
  return doc;
}

async function createSku(
  sellerId: string,
  row: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    useCases: string[];
    images: string[];
    listPrice: number;
    currency: string;
    moq: number;
    tiers: Array<{
      minQty: number;
      maxQty: number | null;
      unitPrice: number;
      leadTimeDays?: number;
    }>;
  },
) {
  const text = `${row.name} ${row.description} ${row.category} ${row.tags.join(" ")}`;
  const embedding = await createEmbedding(text);
  const product = await ProductModel.create({
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags,
    useCases: row.useCases,
    customizationAvailable: false,
    images: row.images,
    pricing: {
      amount: row.listPrice,
      currency: row.currency,
      billingPeriod: "one_time" as const,
    },
    metadata: { website: "", source: "seed-demo", sellerOrgId: sellerId },
    embedding,
  });
  await PricingRuleModel.create({
    sellerUserId: sellerId,
    productId: String(product._id),
    currency: row.currency,
    moq: row.moq,
    tiers: row.tiers,
  });
  console.log("  + SKU:", row.name);
}

async function main() {
  if (!uri) throw new Error("Set MONGO_URI");

  await mongoose.connect(uri, { dbName: "truetrustbuy" });
  console.log("Connected. Password for new sellers:", PASS);

  const s1 = await upsertSeller(
    "demo.packaging@truetrustbuy.test",
    "Demo Packaging Works",
    "Packaging",
  );

  await createSku(String(s1._id), {
    name: "Amber glass bottle 60ml — pharma neck",
    description:
      "USP Type III amber glass vial suitable for pharma and wellness fills. Compatible with CRC caps; batch COA available.",
    category: "Glass packaging",
    tags: ["amber", "glass", "pharma", "cosmetic"],
    useCases: ["syrups", "drops", "samples"],
    images: [ph("78350f", "fef3c7", "Amber+60ml"), ph("44403c", "fce7f3", "Glass+detail")],
    listPrice: 14.5,
    currency: "INR",
    moq: 1200,
    tiers: [
      { minQty: 1200, maxQty: 4999, unitPrice: 14.5, leadTimeDays: 21 },
      { minQty: 5000, maxQty: 19999, unitPrice: 12.9, leadTimeDays: 28 },
      { minQty: 20000, maxQty: null, unitPrice: 11.4, leadTimeDays: 35 },
    ],
  });

  await createSku(String(s1._id), {
    name: "PET jar 500ml wide mouth",
    description:
      "Food-grade PET jar with wide mouth for dry blends and powders. Lightweight and shatter-resistant for courier-friendly packs.",
    category: "Plastic packaging",
    tags: ["PET", "jar", "food-grade"],
    useCases: ["supplements", "spices", "bakery"],
    images: [ph("0ea5e9", "0c4a6e", "PET+500ml")],
    listPrice: 9.25,
    currency: "INR",
    moq: 2000,
    tiers: [
      { minQty: 2000, maxQty: 7999, unitPrice: 9.25 },
      { minQty: 8000, maxQty: null, unitPrice: 8.1 },
    ],
  });

  const s2 = await upsertSeller(
    "demo.textiles@truetrustbuy.test",
    "Demo Textiles Cluster",
    "Textiles",
  );

  await createSku(String(s2._id), {
    name: "GOTS cotton tote 12oz natural",
    description:
      "Heavy 12oz canvas tote, natural undyed base—ideal for retail merch and conference kits. Reinforced handles.",
    category: "Bags & merch",
    tags: ["cotton", "GOTS", "tote", "merch"],
    useCases: ["retail", "events", "corporate gifting"],
    images: [ph("365314", "ecfccb", "Cotton+tote"), ph("166534", "dcfce7", "Canvas")],
    listPrice: 185,
    currency: "INR",
    moq: 300,
    tiers: [
      { minQty: 300, maxQty: 999, unitPrice: 185 },
      { minQty: 1000, maxQty: 4999, unitPrice: 162 },
      { minQty: 5000, maxQty: null, unitPrice: 148 },
    ],
  });

  console.log("\nDone. Sign in as:");
  console.log("  demo.packaging@truetrustbuy.test /", PASS);
  console.log("  demo.textiles@truetrustbuy.test /", PASS);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
