import { z } from "zod";

export const CreateUserPositionSchema = z.object({
  loginId: z.string().min(8),
  email: z.string().email().optional(),
  password: z.string().min(8),
  roleId: z.string(),
  isActive: z.boolean().default(true),
  nidn: z.string().max(50).optional(),
  fullName: z.string().min(1).max(255),
  gender: z.enum(["MALE", "FEMALE"]),
  studyProgramId: z.string(),
  positionId: z.string(),
  facultyId: z.string().optional(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  isActivePosition: z.boolean().optional().default(true),
});

export const UpdateUserPositionSchema = z
  .object({
    loginId: z.string().min(8).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    roleId: z.string().optional(),
    isActive: z.boolean().optional(),
    nidn: z.string().max(50).optional(),
    fullName: z.string().min(1).max(255).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    studyProgramId: z.string().optional(),
    positionId: z.string().optional(),
    facultyId: z.string().optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    isActivePosition: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const UserPositionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  studyProgramId: z.string().optional(),
  positionId: z.string().optional(),
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

export const UserPositionParamsSchema = z.object({
  id: z.string(),
});

export type CreateUserPositionInput = z.infer<typeof CreateUserPositionSchema>;
export type UpdateUserPositionInput = z.infer<typeof UpdateUserPositionSchema>;
export type UserPositionQuery = z.infer<typeof UserPositionQuerySchema>;
export type UserPositionParams = z.infer<typeof UserPositionParamsSchema>;
