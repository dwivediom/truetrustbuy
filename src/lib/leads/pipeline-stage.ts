/** Shared seller CRM pipeline — safe to import from client components (no Mongoose). */
export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "quoted",
  "converted",
  "lost",
  "other",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
