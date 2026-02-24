import z from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const LecturerSafe = z.object({
  id: z.string(),
  userId: z.string(),
  nidn: z.string().nullable(),
  fullName: z.string(),
  gender: z.string(),
  studyProgramId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const LecturerWithRelations = LecturerSafe.extend({
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
  studyProgram: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    faculty: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    }),
  }),
});

export const LecturerModel = {
  list: createPaginatedResponseSchema(z.array(LecturerSafe)),
  get: createResponseSchema(LecturerWithRelations),
  create: createResponseSchema(LecturerSafe),
  update: createResponseSchema(LecturerSafe),
  delete: createResponseSchema(z.null()),
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

export type LecturerModelType = {
  list: z.infer<typeof LecturerModel.list>;
  get: z.infer<typeof LecturerModel.get>;
  create: z.infer<typeof LecturerModel.create>;
  update: z.infer<typeof LecturerModel.update>;
  delete: z.infer<typeof LecturerModel.delete>;
};
