export const en = {
  roleNotFound: "Role not found",
  roleExists: "Role already exists",
  createRoleSuccess: "Role created successfully",
  updateRoleSuccess: "Role updated successfully",
  deleteRoleSuccess: "Role deleted successfully",
  createFeatureSuccess: "Feature created successfully",
  updateFeatureSuccess: "Feature updated successfully",
  deleteFeatureSuccess: "Feature deleted successfully",
  featureNotFound: "Feature not found",
  permissionDenied: "Permission denied",
  deleteSystemRole:
    "Operation Forbidden: This is a protected system feature and cannot be deleted.",
  deleteRoleInUse:
    "Invalid Reference: Cannot delete role that is currently assigned to users.",
  updateSystemRole:
    "Operation Forbidden: This is a protected system feature and cannot be updated.",
  invalidFeatureId: "Invalid feature ID(s)",
} as const;

export type RbacLocale = typeof en;
