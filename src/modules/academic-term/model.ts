import { z } from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const AcademicTermSafe = z.object({
  id: z.string(),
  academicYear: z.string(),
  termType: z.string(),
  termOrder: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AcademicTermOption = z.object({
  id: z.string(),
  label: z.string(), // Concatenated: academicYear + termType
});

export const AcademicTermModel = {
  term: createResponseSchema(AcademicTermSafe),
  terms: createPaginatedResponseSchema(z.array(AcademicTermSafe)),
  getOptions: createPaginatedResponseSchema(z.array(AcademicTermOption)),
  error: createErrorSchema(z.null()),
  validationError: createErrorSchema(
    z.array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    ),
  ),
} as const;
