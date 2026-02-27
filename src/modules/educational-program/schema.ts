import { z } from "zod";

export const CreateProgramPendidikanSchema = z.object({
  name: z.string().min(2).max(100),
  level: z.string().min(1).max(50),
});

export const UpdateProgramPendidikanSchema =
  CreateProgramPendidikanSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided for update",
    },
  );

export const ProgramPendidikanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export const ProgramPendidikanParamsSchema = z.object({
  id: z.string(),
});

export const EducationalProgramOptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export type CreateProgramPendidikanInput = z.infer<
  typeof CreateProgramPendidikanSchema
>;
export type UpdateProgramPendidikanInput = z.infer<
  typeof UpdateProgramPendidikanSchema
>;
export type ProgramPendidikanQuery = z.infer<
  typeof ProgramPendidikanQuerySchema
>;
export type ProgramPendidikanParams = z.infer<
  typeof ProgramPendidikanParamsSchema
>;
export type EducationalProgramOptionsQuery = z.infer<
  typeof EducationalProgramOptionsQuerySchema
>;
