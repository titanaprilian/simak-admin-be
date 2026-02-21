import { z } from "zod";

/**
 * Environment variable schema
 * Fail fast on boot if something is missing or invalid
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.url().default("http://localhost:5173"),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string(),

  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string(),

  DATABASE_URL: z.url(),
});

/**
 * Parse + validate process.env once
 */
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables");
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
