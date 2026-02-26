import z from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const StudyProgramSafe = z.object({
  id: z.string(),
  facultyId: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudyProgramOption = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

export const StudyProgramWithRelations = StudyProgramSafe.extend({
  faculty: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  lecturers: z.array(
    z.object({
      id: z.string(),
      fullName: z.string(),
    }),
  ),
});

export const StudyProgramModel = {
  list: createPaginatedResponseSchema(z.array(StudyProgramSafe)),
  get: createResponseSchema(StudyProgramWithRelations),
  create: createResponseSchema(StudyProgramSafe),
  update: createResponseSchema(StudyProgramSafe),
  delete: createResponseSchema(z.null()),
  getOptions: createPaginatedResponseSchema(z.array(StudyProgramOption)),
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

export type StudyProgramModelType = {
  list: z.infer<typeof StudyProgramModel.list>;
  get: z.infer<typeof StudyProgramModel.get>;
  create: z.infer<typeof StudyProgramModel.create>;
  update: z.infer<typeof StudyProgramModel.update>;
  delete: z.infer<typeof StudyProgramModel.delete>;
  getOptions: z.infer<typeof StudyProgramModel.getOptions>;
};
