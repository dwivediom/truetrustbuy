import { z } from "zod";

const httpsUrl = z
  .string()
  .min(12)
  .max(2048)
  .refine((s) => /^https:\/\//i.test(s), "Use a full https URL for photos");

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  category: z.string().min(2),
  useCases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  customizationAvailable: z.boolean().optional().default(false),
  images: z.array(httpsUrl).max(8).optional().default([]),
  pricing: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().default("USD"),
    billingPeriod: z.enum(["month", "year", "one_time"]).default("month"),
  }),
  metadata: z
    .object({
      website: z.string().default(""),
      source: z.string().default("manual"),
    })
    .default({ website: "", source: "manual" }),
});

export const bulkProductSchema = z.array(productSchema);
export type ProductInput = z.infer<typeof productSchema>;

export const patchProductSchema = productSchema.partial();
export type ProductPatchInput = z.infer<typeof patchProductSchema>;
