import { z } from "zod";
import { createErrorSchema, createResponseSchema } from "@/libs/response";

/**
 * Public user fields
 */
export const PublicUser = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Public user with role name
 */
export const PublicUserWithRole = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  roleName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Auth token response
 */
export const AuthTokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: PublicUser.pick({
    id: true,
    email: true,
    name: true,
  }),
});

/**
 * Auth model schemas
 */
export const AuthModel = {
  login: createResponseSchema(AuthTokenResponse),
  refresh: createResponseSchema(
    z.object({
      access_token: z.string(),
      refresh_token: z.string(),
      user: PublicUser.pick({
        id: true,
        email: true,
        name: true,
      }),
    }),
  ),
  logout: createResponseSchema(z.null()),
  me: createResponseSchema(PublicUserWithRole),

  error: createErrorSchema(z.null()),
  validationError: createErrorSchema(
    z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    ),
  ),

  unauthorizedError: createErrorSchema(
    z.object({
      message: z.string(),
    }),
  ),

  accountDisabledError: createErrorSchema(
    z.object({
      message: z.string(),
    }),
  ),
} as const;

export type AuthModelType = {
  login: z.infer<typeof AuthModel.login>;
  refresh: z.infer<typeof AuthModel.refresh>;
  logout: z.infer<typeof AuthModel.logout>;
  me: z.infer<typeof AuthModel.me>;
};
