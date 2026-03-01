import z from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

const UserData = z.object({
  id: z.string(),
  loginId: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  roleId: z.string(),
  role: z.object({
    id: z.string(),
    name: z.string(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const StudyProgramData = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  faculty: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
});

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

export const LecturerOption = z.object({
  id: z.string(),
  nidn: z.string().nullable(),
  fullName: z.string(),
});

export const LecturerWithRelations = LecturerSafe.extend({
  user: UserData,
  studyProgram: StudyProgramData,
});

export const LecturerWithUser = LecturerSafe.extend({
  user: UserData,
});

export const LecturerListWithUser = z.object({
  id: z.string(),
  userId: z.string(),
  nidn: z.string().nullable(),
  fullName: z.string(),
  gender: z.string(),
  studyProgramId: z.string(),
  studyProgram: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  user: z.object({
    id: z.string(),
    loginId: z.string(),
    email: z.string().nullable(),
    isActive: z.boolean(),
    roleId: z.string(),
    role: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const LecturerModel = {
  list: createPaginatedResponseSchema(z.array(LecturerListWithUser)),
  get: createResponseSchema(LecturerWithRelations),
  create: createResponseSchema(LecturerWithUser),
  update: createResponseSchema(LecturerWithUser),
  delete: createResponseSchema(z.null()),
  getOptions: createPaginatedResponseSchema(z.array(LecturerOption)),
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
