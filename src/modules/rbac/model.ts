import { z } from "zod";
import {
  createErrorSchema,
  createPaginatedResponseSchema,
  createResponseSchema,
} from "@/libs/response";

/**
 * Represents a Feature (Resource)
 */
export const PublicFeature = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Represents a Permission (Link between Role and Feature)
 * Includes the nested Feature name for UI display
 */
export const PublicPermission = z.object({
  featureId: z.string(),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canPrint: z.boolean(),
  feature: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

/**
 * Represents a Role with all its permissions
 */
export const PublicRole = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(PublicPermission),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const RoleOption = z.object({
  id: z.string(),
  name: z.string(),
});

export const PermissionInfo = z.object({
  featureId: z.string(),
  featureName: z.string(),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canPrint: z.boolean(),
});

export const MyRoleResponse = z.object({
  roleName: z.string(),
  permissions: z.array(PermissionInfo),
});

export const RbacModel = {
  // --- FEATURES ---
  getFeatures: createPaginatedResponseSchema(z.array(PublicFeature)),
  createFeature: createResponseSchema(PublicFeature),
  updateFeature: createResponseSchema(PublicFeature),
  deleteFeature: createResponseSchema(PublicFeature),

  // --- ROLES ---
  getRole: createResponseSchema(PublicRole),
  getRoles: createPaginatedResponseSchema(
    z.array(PublicRole.omit({ permissions: true })),
  ),
  getRoleOptions: createPaginatedResponseSchema(z.array(RoleOption)),
  getMyRole: createResponseSchema(MyRoleResponse),
  createRole: createResponseSchema(PublicRole),
  updateRole: createResponseSchema(PublicRole),

  deleteRole: createResponseSchema(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),

  // --- STANDARD ERRORS ---
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

export type RbacModelType = {
  // --- FEATURES ---
  getFeatures: z.infer<typeof RbacModel.getFeatures>;
  createFeature: z.infer<typeof RbacModel.createFeature>;
  updateFeature: z.infer<typeof RbacModel.updateFeature>;
  deleteFeature: z.infer<typeof RbacModel.deleteFeature>;

  // --- ROLES ---
  getRoles: z.infer<typeof RbacModel.getRoles>;
  getRoleOptions: z.infer<typeof RbacModel.getRoleOptions>;
  getMyRole: z.infer<typeof RbacModel.getMyRole>;
  createRole: z.infer<typeof RbacModel.createRole>;
  updateRole: z.infer<typeof RbacModel.updateRole>;
  deleteRole: z.infer<typeof RbacModel.deleteRole>;
};
