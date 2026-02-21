export const es = {
  createSuccess: "Usuario creado exitosamente",
  updateSuccess: "Usuario actualizado exitosamente",
  deleteSuccess: "Usuario eliminado exitosamente",
  getSuccess: "Usuario obtenido exitosamente",
  listSuccess: "Usuarios obtenidos exitosamente",
  userNotFound: "Usuario no encontrado",
  deleteSelf: "No puedes eliminar tu propia cuenta",
  createSystemAdmin: "No puedes crear otro usuario con rol SuperAdmin",
  updateSystemAdmin:
    "No puedes actualizar el estado del usuario con rol SuperAdmin",
  invalidRole: "Rol inválido",
  cannotDisableOwnAccount: "No puedes deshabilitar tu propia cuenta",
} as const;

export type UserLocale = typeof es;
