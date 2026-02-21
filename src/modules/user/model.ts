import { z } from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const UserSafe = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  isActive: z.boolean(),
  roleId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserModel = {
  user: createResponseSchema(
    UserSafe.extend({
      roleName: z.string(),
    }),
  ),
  users: createPaginatedResponseSchema(
    z.array(
      UserSafe.extend({
        roleName: z.string(),
      }),
    ),
  ),
  createResult: createResponseSchema(UserSafe),
  deleteResult: createResponseSchema(UserSafe),

  error: createErrorSchema(z.null()),
  validationError: createErrorSchema(
    z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    ),
  ),
} as const;

export type UserModelType = {
  user: z.infer<typeof UserModel.user>;
  users: z.infer<typeof UserModel.users>;
  deleteResult: z.infer<typeof UserModel.deleteResult>;
};
