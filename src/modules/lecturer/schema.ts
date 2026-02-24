import { z } from "zod";

export const CreateLecturerSchema = z.object({
  userId: z.string(),
  nidn: z.string().max(50).optional(),
  fullName: z.string().min(1).max(255),
  gender: z.enum(["MALE", "FEMALE"]),
  studyProgramId: z.string(),
});

export const UpdateLecturerSchema = z.object({
  userId: z.string().optional(),
  nidn: z.string().max(50).optional(),
  fullName: z.string().min(1).max(255).optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  studyProgramId: z.string().optional(),
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

export type CreateLecturerInput = z.infer<typeof CreateLecturerSchema>;
export type UpdateLecturerInput = z.infer<typeof UpdateLecturerSchema>;
export type LecturerQuery = z.infer<typeof LecturerQuerySchema>;
export type LecturerParams = z.infer<typeof LecturerParamsSchema>;
