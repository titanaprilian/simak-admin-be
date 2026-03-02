export const id = {
  listSuccess: "Data semester akademik berhasil diambil",
  getSuccess: "Data semester akademik berhasil diambil",
  createSuccess: "Semester akademik berhasil dibuat",
  updateSuccess: "Semester akademik berhasil diperbarui",
  deleteSuccess: "Semester akademik berhasil dihapus",
  notFound: "Semester akademik tidak ditemukan",
  invalidDate: "Tanggal mulai harus sebelum tanggal selesai",
  activeSwitched: "Semester aktif telah dialihkan",
} as const;

export type UserLocale = typeof id;
