import { PaginationSchema } from "@/libs/response";
import { z } from "zod";

export const CreateUserLecturerSchema = z.object({
  loginId: z.string().min(8),
  email: z.email().optional(),
  password: z.string().min(8),
  roleId: z.string(),
  isActive: z.boolean().default(true),
  nidn: z.string().max(50).optional(),
  fullName: z.string().min(1).max(255),
  gender: z.enum(["MALE", "FEMALE"]),
  studyProgramId: z.string(),
});

export const UpdateUserLecturerSchema = z
  .object({
    loginId: z.string().min(8).optional(),
    email: z.email().optional(),
    password: z.string().min(8).optional(),
    roleId: z.string().optional(),
    isActive: z.boolean().optional(),
    nidn: z.string().max(50).optional(),
    fullName: z.string().min(1).max(255).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    studyProgramId: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const LecturerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  studyProgramId: z.string().optional(),
});

export const LecturerParamsSchema = z.object({
  id: z.string(),
});

export const LecturerOptionsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
});

export type CreateUserLecturerInput = z.infer<typeof CreateUserLecturerSchema>;
export type UpdateUserLecturerInput = z.infer<typeof UpdateUserLecturerSchema>;
export type LecturerQuery = z.infer<typeof LecturerQuerySchema>;
export type LecturerParams = z.infer<typeof LecturerParamsSchema>;
export type LecturerOptionsQuery = z.infer<typeof LecturerOptionsQuerySchema>;
