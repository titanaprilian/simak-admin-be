import { z } from "zod";

export const CreateFacultySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
});

export const UpdateFacultySchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
});

export const FacultyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export const FacultyParamsSchema = z.object({
  id: z.string(),
});

export type CreateFacultyInput = z.infer<typeof CreateFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof UpdateFacultySchema>;
export type FacultyQuery = z.infer<typeof FacultyQuerySchema>;
export type FacultyParams = z.infer<typeof FacultyParamsSchema>;
