import { z } from "zod";
import { CompletionsRequestSchema } from "./schemas";

export type CompletionsRequestType = z.infer<typeof CompletionsRequestSchema>;
