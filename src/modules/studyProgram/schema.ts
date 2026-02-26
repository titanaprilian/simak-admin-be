import { z } from "zod";
import { PaginationSchema } from "@/libs/response";

export const CreateStudyProgramSchema = z.object({
  facultyId: z.string(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const UpdateStudyProgramSchema = z.object({
  facultyId: z.string().optional(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export const StudyProgramQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  facultyId: z.string().optional(),
  sortBy: z.enum(["code", "name", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const StudyProgramOptionsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  facultyId: z.string().optional(),
});

export const StudyProgramParamsSchema = z.object({
  id: z.string(),
});

export type CreateStudyProgramInput = z.infer<typeof CreateStudyProgramSchema>;
export type UpdateStudyProgramInput = z.infer<typeof UpdateStudyProgramSchema>;
export type StudyProgramQuery = z.infer<typeof StudyProgramQuerySchema>;
export type StudyProgramParams = z.infer<typeof StudyProgramParamsSchema>;
export type StudyProgramOptionsQuery = z.infer<
  typeof StudyProgramOptionsQuerySchema
>;
