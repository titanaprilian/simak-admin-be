import { PaginationSchema } from "@/libs/response";
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(2).max(50).optional(),
  password: z.string().min(8),
  roleId: z.string(),
  isActive: z.boolean().default(true),
});

export const UpdateUserSchema = z
  .object({
    email: z.email().optional(),
    name: z.string().min(2).max(50).optional(),
    password: z.string().min(8).optional(),
    roleId: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const UserParamSchema = z.object({
  id: z.string(),
});

export const GetUsersQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((val) => val === true || val === "true")
    .optional(),
});

/**
 * Inferred types
 */
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
