import { z } from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const AcademicClassSafe = z.object({
  id: z.string(),
  name: z.string(),
  studyProgramId: z.string(),
  enrollmentYear: z.number(),
  capacity: z.number(),
  advisorLecturerId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AcademicClassWithRelations = AcademicClassSafe.extend({
  studyProgram: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  advisorLecturer: z
    .object({
      id: z.string(),
      fullName: z.string(),
    })
    .nullable(),
});

export const AcademicClassModel = {
  academicClass: createResponseSchema(AcademicClassSafe),
  academicClasses: createPaginatedResponseSchema(
    z.array(AcademicClassWithRelations),
  ),
  createResult: createResponseSchema(AcademicClassSafe),
  updateResult: createResponseSchema(AcademicClassSafe),
  deleteResult: createResponseSchema(AcademicClassSafe),

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

export type AcademicClassModelType = {
  academicClass: z.infer<typeof AcademicClassModel.academicClass>;
  academicClasses: z.infer<typeof AcademicClassModel.academicClasses>;
  deleteResult: z.infer<typeof AcademicClassModel.deleteResult>;
};
