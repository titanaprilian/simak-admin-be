import { z } from "zod";
import { PaginationSchema } from "@/libs/response";

export const CreateFacultySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const UpdateFacultySchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export const FacultyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.enum(["code", "name", "createdAt"]).default("code"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const FacultyParamsSchema = z.object({
  id: z.string(),
});

export const FacultyOptionsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
});

export type CreateFacultyInput = z.infer<typeof CreateFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof UpdateFacultySchema>;
export type FacultyQuery = z.infer<typeof FacultyQuerySchema>;
export type FacultyParams = z.infer<typeof FacultyParamsSchema>;
export type FacultyOptionsQuery = z.infer<typeof FacultyOptionsQuerySchema>;
