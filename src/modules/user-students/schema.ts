import { z } from "zod";
import { PaginationSchema } from "@/libs/response";

export const CreateUserStudentSchema = z.object({
  loginId: z.string().min(1, "Login ID is required").max(50),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.string().min(1, "Role ID is required"),
  name: z.string().min(1, "Name is required").max(255),
  generation: z.number().int().min(1900).max(2100),
  gender: z.enum(["male", "female"]),
  yearOfEntry: z.number().int().min(1900).max(2100),
  birthYear: z.number().int().min(1900).max(2100),
  address: z.string().max(500).optional(),
  statusMhs: z
    .enum([
      "tidak_aktif",
      "belum_program",
      "belum_daftar_ulang",
      "sudah_program",
    ])
    .optional(),
  kelas: z.string().max(50).optional(),
  jenis: z.enum(["reguler", "reguler_transfer"]).optional(),
  cityBirth: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  semester: z.number().int().min(1).max(20).optional(),
  studyProgramId: z.string().min(1, "Study program ID is required"),
});

export type CreateUserStudentInput = z.infer<typeof CreateUserStudentSchema>;

export const UpdateUserStudentSchema = z
  .object({
    email: z.string().email("Invalid email format").optional(),
    name: z.string().min(1, "Name is required").max(255).optional(),
    generation: z.number().int().min(1900).max(2100).optional(),
    gender: z.enum(["male", "female"]).optional(),
    yearOfEntry: z.number().int().min(1900).max(2100).optional(),
    birthYear: z.number().int().min(1900).max(2100).optional(),
    address: z.string().max(500).optional(),
    statusMhs: z
      .enum([
        "tidak_aktif",
        "belum_program",
        "belum_daftar_ulang",
        "sudah_program",
      ])
      .optional(),
    kelas: z.string().max(50).optional(),
    jenis: z.enum(["reguler", "reguler_transfer"]).optional(),
    cityBirth: z.string().max(100).optional(),
    phoneNumber: z.string().max(20).optional(),
    semester: z.number().int().min(1).max(20).optional(),
    studyProgramId: z
      .string()
      .min(1, "Study program ID is required")
      .optional(),
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
});

export type StudentQuery = z.infer<typeof StudentQuerySchema>;
