import z from "zod";
export const CompletionsRequestSchema = z.object({
  role: z.string(),
  content: z.string(),
});
