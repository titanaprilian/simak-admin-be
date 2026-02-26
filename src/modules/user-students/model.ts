import z from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

const StudyProgramData = z.object({
  id: z.string(),
  name: z.string(),
});

export const StudentData = z.object({
  id: z.string(),
  nim: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  name: z.string(),
  generation: z.number(),
  gender: z.string(),
  yearOfEntry: z.number(),
  birthYear: z.number(),
  address: z.string().nullable(),
  statusMhs: z.string(),
  kelas: z.string().nullable(),
  jenis: z.string(),
  cityBirth: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  semester: z.number(),
  studyProgram: StudyProgramData,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudentModel = {
  list: createPaginatedResponseSchema(z.array(StudentData)),
  create: createResponseSchema(StudentData),
  get: createResponseSchema(StudentData),
  update: createResponseSchema(StudentData),
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

export type StudentModelType = {
  list: z.infer<typeof StudentModel.list>;
  create: z.infer<typeof StudentModel.create>;
  get: z.infer<typeof StudentModel.get>;
  update: z.infer<typeof StudentModel.update>;
};
