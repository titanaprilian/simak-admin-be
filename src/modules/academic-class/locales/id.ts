export const id = {
  listSuccess: "Kelas akademik berhasil diambil",
  createSuccess: "Kelas akademik berhasil dibuat",
  updateSuccess: "Kelas akademik berhasil diperbarui",
  deleteSuccess: "Kelas akademik berhasil dihapus",
  getSuccess: "Detail kelas akademik berhasil diambil",
  getByIdSuccess: "Kelas akademik berhasil diambil",
  bulkCreateSuccess: "Kelas akademik berhasil dibuat",
  notFound: "Kelas akademik tidak ditemukan",
  duplicate:
    "Kelas akademik dengan nama ini sudah ada untuk program studi dan tahun yang diberikan",
  studyProgramNotFound: "Program studi tidak ditemukan",
  lecturerNotFound: "Dosen tidak ditemukan",
  invalidStudyProgram: "Program studi tidak valid",
} as const;

export type AcademicClassLocale = typeof id;
