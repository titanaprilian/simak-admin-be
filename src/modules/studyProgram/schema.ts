import { z } from "zod";

export const CreateStudyProgramSchema = z.object({
  facultyId: z.string(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
});

export const UpdateStudyProgramSchema = z.object({
  facultyId: z.string().optional(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
});

export const StudyProgramQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
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
