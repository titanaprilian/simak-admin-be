import { z } from "zod";

/**
 * Schema for login
 */
export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/**
 * Schema for token
 */
export const TokenSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
});

/**
 * Inferred types
 */
export type LoginInput = z.infer<typeof LoginSchema>;
