import { z } from "zod";
import { createResponseSchema } from "@/libs/response";

const HealthOkPayload = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
  timestamp: z.string(),
  db: z.union([z.literal("up"), z.literal("down")]),
});

const HealthShuttingDownPayload = z.object({
  status: z.literal("shutting_down"),
  uptime: z.number(),
  timestamp: z.string(),
});

export const HealthModel = {
  ok: createResponseSchema(HealthOkPayload),
  shuttingDown: createResponseSchema(HealthShuttingDownPayload),
} as const;

export type HealthModelType = {
  ok: z.infer<typeof HealthModel.ok>;
  shuttingDown: z.infer<typeof HealthModel.shuttingDown>;
};
