import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { chunkText } from "@/lib/knowledge/chunk-text";
import { SellerKnowledgeChunkModel } from "@/lib/models/SellerKnowledgeChunk";
import { createEmbedding } from "@/lib/search/embeddings";
import { Types } from "mongoose";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

async function extractPdfText(buf: Buffer): Promise<string> {
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = (
    typeof mod === "object" && mod && "default" in mod && typeof mod.default === "function"
      ? mod.default
      : mod
  ) as (b: Buffer) => Promise<{ text?: string }>;
  const parsed = await pdfParse(buf);
  return parsed.text ?? "";
}

export async function POST(request: Request) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large (max 4MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  let text = "";
  if (lower.endsWith(".pdf")) {
    text = await extractPdfText(buf);
  } else if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type === "text/plain") {
    text = buf.toString("utf8");
  } else {
    return Response.json(
      { error: "Unsupported type. Upload PDF or plain text (.txt)." },
      { status: 400 },
    );
  }

  text = text.trim();
  if (!text) {
    return Response.json({ error: "No extractable text in file" }, { status: 400 });
  }

  const sellerUserId = access.session.user.id;
  const sourceId = new Types.ObjectId().toString();
  const pieces = chunkText(text);
  const docs: Array<{
    sellerUserId: string;
    sourceId: string;
    sourceFilename: string;
    chunkIndex: number;
    text: string;
    embedding: number[];
  }> = [];

  let idx = 0;
  for (const piece of pieces) {
    const embedding = await createEmbedding(piece);
    docs.push({
      sellerUserId,
      sourceId,
      sourceFilename: name,
      chunkIndex: idx,
      text: piece,
      embedding,
    });
    idx += 1;
  }

  await SellerKnowledgeChunkModel.insertMany(docs);

  return Response.json({ ok: true, sourceId, chunks: docs.length, filename: name }, { status: 201 });
}
