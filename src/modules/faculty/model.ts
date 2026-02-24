import z from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

export const FacultySafe = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const FacultyWithRelations = FacultySafe.extend({
  programs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    }),
  ),
});

export const FacultyModel = {
  list: createPaginatedResponseSchema(z.array(FacultySafe)),
  get: createResponseSchema(FacultyWithRelations),
  create: createResponseSchema(FacultySafe),
  update: createResponseSchema(FacultySafe),
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

export type FacultyModelType = {
  list: z.infer<typeof FacultyModel.list>;
  get: z.infer<typeof FacultyModel.get>;
  create: z.infer<typeof FacultyModel.create>;
  update: z.infer<typeof FacultyModel.update>;
  delete: z.infer<typeof FacultyModel.delete>;
};
