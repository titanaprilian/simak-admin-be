import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";
import { z } from "zod";

export const PositionSafe = z.object({
  id: z.string(),
  name: z.string(),
  scopeType: z.enum(["FACULTY", "STUDY_PROGRAM"]),
  isSingleSeat: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PositionAssignmentSafe = z.object({
  id: z.string(),
  userId: z.string(),
  positionId: z.string(),
  facultyId: z.string().nullable(),
  studyProgramId: z.string().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: z.object({
    id: z.string(),
    loginId: z.string(),
    email: z.string().nullable(),
  }),
  position: z.object({
    id: z.string(),
    name: z.string(),
    scopeType: z.enum(["FACULTY", "STUDY_PROGRAM"]),
  }),
  faculty: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    })
    .nullable(),
  studyProgram: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      facultyId: z.string(),
    })
    .nullable(),
});

export const PositionModel = {
  listPositions: createPaginatedResponseSchema(z.array(PositionSafe)),
  createPosition: createResponseSchema(PositionSafe),
  updatePosition: createResponseSchema(PositionSafe),
  deletePosition: createResponseSchema(PositionSafe),
  getPosition: createResponseSchema(PositionSafe),

  listAssignments: createPaginatedResponseSchema(
    z.array(PositionAssignmentSafe),
  ),
  createAssignment: createResponseSchema(PositionAssignmentSafe),
  updateAssignment: createResponseSchema(PositionAssignmentSafe),
  deleteAssignment: createResponseSchema(PositionAssignmentSafe),

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
