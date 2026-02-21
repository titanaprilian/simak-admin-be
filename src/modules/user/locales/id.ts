export const id = {
  createSuccess: "Pengguna berhasil dibuat",
  updateSuccess: "Pengguna berhasil diperbarui",
  deleteSuccess: "Pengguna berhasil dihapus",
  getSuccess: "Pengguna berhasil diambil",
  listSuccess: "Pengguna berhasil diambil",
  userNotFound: "Pengguna tidak ditemukan",
  deleteSelf: "Anda tidak dapat menghapus akun Anda sendiri",
  createSystemAdmin:
    "Tidak dapat membuat pengguna lain dengan peran SuperAdmin",
  updateSystemAdmin:
    "Tidak dapat memperbarui status pengguna dengan peran SuperAdmin",
  invalidRole: "Peran tidak valid",
  cannotDisableOwnAccount: "Anda tidak dapat menonaktifkan akun Anda sendiri",
} as const;

export type UserLocale = typeof id;
