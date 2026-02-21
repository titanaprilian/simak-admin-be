export const es = {
  loginSuccess: "Inicio de sesión exitoso",
  loginFailed: "Email o contraseña inválidos",
  logoutSuccess: "Cierre de sesión exitoso",
  logoutAllSuccess: "Cierre de sesión exitoso en todos los dispositivos",
  refreshSuccess: "Token actualizado exitosamente",
  refreshFailed: "Token de actualización inválido o expirado",
  registerSuccess: "Registro exitoso",
  registerFailed: "Registro fallido",
  emailAlreadyExists: "El email ya existe",
  emailNotFound: "Email no encontrado",
  invalidCredentials: "Email o contraseña inválidos",
  accountDisabled: "Tu cuenta ha sido deshabilitada.",
  accountNotVerified: "Cuenta no verificada",
  passwordChanged: "Contraseña cambiada exitosamente",
  passwordMismatch: "La contraseña actual es incorrecta",
  tokenRequired: "El token es requerido",
  invalidToken: "Token inválido o expirado",
  tokenBlacklisted: "El token ha sido revocado",
} as const;

export type AuthLocale = typeof es;
