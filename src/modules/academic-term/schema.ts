import { z } from "zod";
import { PaginationSchema } from "@/libs/response";

export const TermTypeEnum = z.enum(["GANJIL", "GENAP"]);

const AcademicTermShape = z.object({
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/, "Format must be YYYY/YYYY"),
  termType: TermTypeEnum,
  termOrder: z.preprocess(
    (val) =>
      val === null || val === undefined || Number.isNaN(val) ? undefined : val,
    z.number().min(1).optional(),
  ),
  startDate: z.string().pipe(z.coerce.date()),
  endDate: z.string().pipe(z.coerce.date()),
  isActive: z.boolean().optional(),
});

export const CreateAcademicTermSchema = AcademicTermShape.refine(
  (data) => data.startDate < data.endDate,
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  },
);

export const UpdateAcademicTermSchema = AcademicTermShape.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided for update",
  },
);

export const GetAcademicTermsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  isActive: z.preprocess((val) => val === "true", z.boolean()).optional(),
});

export type CreateAcademicTermInput = z.infer<typeof CreateAcademicTermSchema>;
export type UpdateAcademicTermInput = z.infer<typeof UpdateAcademicTermSchema>;
