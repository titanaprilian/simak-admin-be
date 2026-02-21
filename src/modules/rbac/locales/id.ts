export const id = {
  roleNotFound: "Peran tidak ditemukan",
  roleExists: "Peran sudah ada",
  createRoleSuccess: "Peran berhasil dibuat",
  updateRoleSuccess: "Peran berhasil diperbarui",
  deleteRoleSuccess: "Peran berhasil dihapus",
  createFeatureSuccess: "Fitur berhasil dibuat",
  updateFeatureSuccess: "Fitur berhasil diperbarui",
  deleteFeatureSuccess: "Fitur berhasil dihapus",
  featureNotFound: "Fitur tidak ditemukan",
  permissionDenied: "Izin ditolak",
  deleteSystemRole: "Tidak dapat menghapus peran atau fitur sistem",
  deleteRoleInUse:
    "Tidak dapat menghapus peran: sedang ditugaskan ke satu atau lebih pengguna.",
  updateSystemRole: "Tidak dapat memperbarui peran atau fitur sistem",
  invalidFeatureId: "ID fitur tidak valid",
} as const;

export type RbacLocale = typeof id;
