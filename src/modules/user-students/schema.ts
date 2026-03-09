import { z } from "zod";
import { PaginationSchema } from "@/libs/response";

export const CreateUserStudentSchema = z.object({
  loginId: z.string().min(1, "Login ID is required").max(50).optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.string().min(1, "Role ID is required").optional(),
  name: z.string().min(1, "Name is required").max(255),
  gender: z.enum(["male", "female"]),
  birthYear: z.number().int().min(1900).max(2100),
  address: z.string().max(500).optional(),
  jenis: z.enum(["reguler", "reguler_transfer", "reguler_khusus"]).optional(),
  cityBirth: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  studyProgramId: z.string().min(1, "Study program ID is required"),
  academicClassId: z
    .string()
    .min(1, "Academic class ID is required")
    .optional(),
  enrollmentTermId: z.string().min(1, "Enrollment term ID is required"),
});

export type CreateUserStudentInput = z.infer<typeof CreateUserStudentSchema>;

export const UpdateUserStudentSchema = z
  .object({
    email: z.string().email("Invalid email format").optional(),
    loginId: z.string().min(1, "Login ID is required").max(50).optional(),
    name: z.string().min(1, "Name is required").max(255).optional(),
    gender: z.enum(["male", "female"]).optional(),
    birthYear: z.number().int().min(1900).max(2100).optional(),
    address: z.string().max(500).optional(),
    jenis: z.enum(["reguler", "reguler_transfer", "reguler_khusus"]).optional(),
    cityBirth: z.string().max(100).optional(),
    phoneNumber: z.string().max(20).optional(),
    academicClassId: z
      .string()
      .min(1, "Academic class ID is required")
      .optional(),
    // Note: studyProgramId and enrollmentTermId are intentionally not updatable.
    // Program transfers must go through the dedicated transfer endpoint.
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateUserStudentInput = z.infer<typeof UpdateUserStudentSchema>;

export const StudentParamSchema = z.object({
  id: z.string(),
});

export const StudentQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  studyProgramId: z.string().optional(),
  facultyId: z.string().optional(),
  semester: z.string().optional(),
  isActive: z.string().optional(),
});

export type StudentQuery = z.infer<typeof StudentQuerySchema>;
