export const en = {
  loginSuccess: "User login successfully",
  loginFailed: "Invalid email or password",
  logoutSuccess: "Logged out successfully",
  logoutAllSuccess: "Logged out from all devices",
  refreshSuccess: "Token refreshed successfully",
  refreshFailed: "Invalid or expired refresh token",
  registerSuccess: "Registration successful",
  registerFailed: "Registration failed",
  emailAlreadyExists: "Email already exists",
  emailNotFound: "Email not found",
  invalidCredentials: "Invalid email or password",
  accountDisabled: "Your account has been disabled.",
  accountNotVerified: "Account not verified",
  passwordChanged: "Password changed successfully",
  passwordMismatch: "Current password is incorrect",
  tokenRequired: "Refresh token is required to confirm identity",
  invalidToken: "Invalid refresh token",
  tokenBlacklisted: "Token has been revoked",
} as const;

export type AuthLocale = typeof en;
