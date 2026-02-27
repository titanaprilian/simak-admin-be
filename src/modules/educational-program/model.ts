import z from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const ProgramPendidikanSafe = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EducationalProgramOption = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
});

export const ProgramPendidikanModel = {
  list: createPaginatedResponseSchema(z.array(ProgramPendidikanSafe)),
  get: createResponseSchema(ProgramPendidikanSafe),
  create: createResponseSchema(ProgramPendidikanSafe),
  update: createResponseSchema(ProgramPendidikanSafe),
  delete: createResponseSchema(ProgramPendidikanSafe),
  getOptions: createPaginatedResponseSchema(z.array(EducationalProgramOption)),
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

export type ProgramPendidikanModelType = {
  list: z.infer<typeof ProgramPendidikanModel.list>;
  get: z.infer<typeof ProgramPendidikanModel.get>;
  create: z.infer<typeof ProgramPendidikanModel.create>;
  update: z.infer<typeof ProgramPendidikanModel.update>;
  delete: z.infer<typeof ProgramPendidikanModel.delete>;
};
