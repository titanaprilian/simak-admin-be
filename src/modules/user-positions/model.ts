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
});

const FacultyData = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

const PositionData = z.object({
  id: z.string(),
  name: z.string(),
  scopeType: z.enum(["FACULTY", "STUDY_PROGRAM"]),
  isSingleSeat: z.boolean(),
});

const PositionAssignmentData = z.object({
  id: z.string(),
  userId: z.string(),
  positionId: z.string(),
  facultyId: z.string().nullable(),
  studyProgramId: z.string().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  isActive: z.boolean(),
  position: PositionData,
  faculty: FacultyData.nullable(),
  studyProgram: StudyProgramData.nullable(),
});

export const LecturerWithUserAndPosition = z.object({
  id: z.string(),
  userId: z.string(),
  nidn: z.string().nullable(),
  fullName: z.string(),
  gender: z.string(),
  studyProgramId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: UserData,
  studyProgram: StudyProgramData,
  positionAssignment: PositionAssignmentData.nullable(),
});

export const LecturerWithUser = z.object({
  id: z.string(),
  userId: z.string(),
  nidn: z.string().nullable(),
  fullName: z.string(),
  gender: z.string(),
  studyProgramId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: UserData,
});

export const UserPositionListItem = z.object({
  id: z.string(),
  userId: z.string(),
  nidn: z.string().nullable(),
  fullName: z.string(),
  gender: z.string(),
  studyProgramId: z.string(),
  studyProgram: StudyProgramData,
  user: UserData,
  positionAssignment: PositionAssignmentData.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserPositionModel = {
  list: createPaginatedResponseSchema(z.array(UserPositionListItem)),
  get: createResponseSchema(LecturerWithUserAndPosition),
  create: createResponseSchema(LecturerWithUser),
  update: createResponseSchema(LecturerWithUser),
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

export type UserPositionModelType = {
  list: z.infer<typeof UserPositionModel.list>;
  get: z.infer<typeof UserPositionModel.get>;
  create: z.infer<typeof UserPositionModel.create>;
  update: z.infer<typeof UserPositionModel.update>;
  delete: z.infer<typeof UserPositionModel.delete>;
};
