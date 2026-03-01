import { PaginationSchema } from "@/libs/response";
import { z } from "zod";

export const CreateAcademicClassSchema = z.object({
  name: z.string().min(1),
  studyProgramId: z.string(),
  enrollmentYear: z.number().min(2000),
  capacity: z.number().min(1).optional(),
  advisorLecturerId: z.string().optional(),
});

export const UpdateAcademicClassSchema = z
  .object({
    name: z.string().min(1).optional(),
    studyProgramId: z.string().optional(),
    enrollmentYear: z.number().min(2000).optional(),
    capacity: z.number().min(1).optional(),
    advisorLecturerId: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const AcademicClassParamSchema = z.object({
  id: z.string(),
});

export const GetAcademicClassesQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  studyProgramId: z.string().optional(),
  enrollmentYear: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z.number().min(2000).optional(),
    )
    .optional(),
});

export const BulkCreateAcademicClassSchema = z.object({
  studyProgramId: z.string(),
  enrollmentYear: z.number().min(2000),
  capacity: z.number().min(1).optional(),
  totalClasses: z.preprocess(
    (val) => (val === undefined ? undefined : Number(val)),
    z.number().min(1).max(26),
  ),
});

export type CreateAcademicClassInput = z.infer<
  typeof CreateAcademicClassSchema
>;
export type UpdateAcademicClassInput = z.infer<
  typeof UpdateAcademicClassSchema
>;
export type BulkCreateAcademicClassInput = z.infer<
  typeof BulkCreateAcademicClassSchema
>;
