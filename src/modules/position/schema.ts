import { PaginationSchema } from "@/libs/response";
import { z } from "zod";

export const ScopeTypeSchema = z.enum(["FACULTY", "STUDY_PROGRAM"]);

export const CreatePositionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  scopeType: ScopeTypeSchema,
  isSingleSeat: z.boolean().optional().default(false),
});

export const UpdatePositionSchema = CreatePositionSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided for update",
  },
);

export const PositionParamsSchema = z.object({
  id: z.string(),
});

export const GetPositionsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  scopeType: ScopeTypeSchema.optional(),
});

export const CreatePositionAssignmentSchema = z.object({
  userId: z.string(),
  positionId: z.string(),
  facultyId: z.string().optional(),
  studyProgramId: z.string().optional(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdatePositionAssignmentSchema =
  CreatePositionAssignmentSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided for update",
    },
  );

export const AssignmentParamsSchema = z.object({
  id: z.string(),
});

export const GetAssignmentsQuerySchema = PaginationSchema.extend({
  userId: z.string().optional(),
  positionId: z.string().optional(),
  facultyId: z.string().optional(),
  studyProgramId: z.string().optional(),
  isActive: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        if (val === "true") return true;
        if (val === "false") return false;
      }
      return val;
    }, z.boolean().optional())
    .optional(),
});

export type CreatePositionInput = z.infer<typeof CreatePositionSchema>;
export type UpdatePositionInput = z.infer<typeof UpdatePositionSchema>;
export type CreatePositionAssignmentInput = z.infer<
  typeof CreatePositionAssignmentSchema
>;
export type UpdatePositionAssignmentInput = z.infer<
  typeof UpdatePositionAssignmentSchema
>;
export type GetPositionsQueryInput = z.infer<typeof GetPositionsQuerySchema>;
export type GetAssignmentsQueryInput = z.infer<
  typeof GetAssignmentsQuerySchema
>;
