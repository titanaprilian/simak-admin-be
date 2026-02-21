export const id = {
  loginSuccess: "Login berhasil",
  loginFailed: "Email atau kata sandi tidak valid",
  logoutSuccess: "Logout berhasil",
  logoutAllSuccess: "Logout berhasil dari semua perangkat",
  refreshSuccess: "Token berhasil diperbarui",
  refreshFailed: "Token penyegaran tidak valid atau kedaluwarsa",
  registerSuccess: "Pendaftaran berhasil",
  registerFailed: "Pendaftaran gagal",
  emailAlreadyExists: "Email sudah ada",
  emailNotFound: "Email tidak ditemukan",
  invalidCredentials: "Email atau kata sandi tidak valid",
  accountDisabled: "Akun Anda telah dinonaktifkan.",
  accountNotVerified: "Akun belum diverifikasi",
  passwordChanged: "Kata sandi berhasil diubah",
  passwordMismatch: "Kata sandi saat ini salah",
  tokenRequired: "Token diperlukan",
  invalidToken: "Token tidak valid atau kedaluwarsa",
  tokenBlacklisted: "Token telah dicabut",
} as const;

export type AuthLocale = typeof id;
