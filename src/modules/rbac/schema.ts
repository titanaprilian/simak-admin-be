import { PaginationSchema } from "@/libs/response";
import { z } from "zod";

const DefaultPermissionSchema = z.object({
  canCreate: z.boolean().default(false),
  canRead: z.boolean().default(false),
  canUpdate: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  canPrint: z.boolean().default(false),
});
const PermissionSchema = DefaultPermissionSchema.extend({
  featureId: z.string(),
});
export const CreateRoleSchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().optional().nullable(),
  permissions: z
    .array(PermissionSchema)
    .optional()
    .default([])
    .refine(
      (items) => {
        const featureIds = items.map((p) => p.featureId);
        return new Set(featureIds).size === featureIds.length;
      },
      {
        message: "Duplicate featureId found in permissions array",
      },
    ),
});
export const CreateFeatureSchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().optional().nullable(),
  defaultPermissions: DefaultPermissionSchema,
});

export const UpdateRoleSchema = CreateRoleSchema.omit({ permissions: true })
  .partial()
  .extend({
    permissions: z.array(PermissionSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
export const UpdateFeatureSchema = CreateFeatureSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided for update",
  },
);

export const RoleParamSchema = z.object({
  id: z.string(),
});
export const FeatureParamSchema = z.object({
  id: z.string(),
});
export const GetFeaturesQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
});
export const GetRolesQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  feature: z.string().optional(),
});
export const GetRolesOptionsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type CreateFeatureInput = z.infer<typeof CreateFeatureSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdateFeatureInput = z.infer<typeof UpdateFeatureSchema>;
export type PermissionInput = z.infer<typeof PermissionSchema>;
