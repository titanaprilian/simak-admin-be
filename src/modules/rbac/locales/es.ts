export const es = {
  roleNotFound: "Rol no encontrado",
  roleExists: "El rol ya existe",
  createRoleSuccess: "Rol creado exitosamente",
  updateRoleSuccess: "Rol actualizado exitosamente",
  deleteRoleSuccess: "Rol eliminado exitosamente",
  createFeatureSuccess: "Característica creada exitosamente",
  updateFeatureSuccess: "Característica actualizada exitosamente",
  deleteFeatureSuccess: "Característica eliminada exitosamente",
  featureNotFound: "Característica no encontrada",
  permissionDenied: "Permiso denegado",
  deleteSystemRole: "No se puede eliminar el rol o característica del sistema",
  deleteRoleInUse:
    "No se puede eliminar el rol: está asignado a uno o más usuarios.",
  updateSystemRole:
    "No se puede actualizar el rol o característica del sistema",
  invalidFeatureId: "ID(s) de característica inválido(s)",
} as const;

export type RbacLocale = typeof es;
