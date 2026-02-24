import { z } from "zod";

/**
 * Schema for login
 */
export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/**
 * Schema for login with loginId
 */
export const LoginIdSchema = z.object({
  loginId: z.string().trim().min(1),
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
 * Internal login result shape returned by AuthService.
 */
export const LoginResultSchema = z.object({
  id: z.string(),
  loginId: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  tokenVersion: z.number().int(),
});

/**
 * Inferred types
 */
export type LoginInput = z.infer<typeof LoginSchema>;
export type LoginIdInput = z.infer<typeof LoginIdSchema>;
export type LoginResult = z.infer<typeof LoginResultSchema>;
