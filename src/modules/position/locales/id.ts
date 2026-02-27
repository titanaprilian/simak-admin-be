export const id = {
  listSuccess: "Posisi berhasil diambil",
  getSuccess: "Posisi berhasil diambil",
  createSuccess: "Posisi berhasil dibuat",
  updateSuccess: "Posisi berhasil diperbarui",
  deleteSuccess: "Posisi berhasil dihapus",

  assignmentListSuccess: "Penugasan posisi berhasil diambil",
  assignmentCreateSuccess: "Penugasan posisi berhasil dibuat",
  assignmentUpdateSuccess: "Penugasan posisi berhasil diperbarui",
  assignmentDeleteSuccess: "Penugasan posisi berhasil dihapus",

  invalidAssignment: "Payload penugasan posisi tidak valid",
  invalidStartDate: "Tanggal mulai tidak valid",
  invalidDateRange:
    "Tanggal selesai harus lebih besar atau sama dengan tanggal mulai",
  positionNotFound: "Posisi tidak ditemukan",
  facultyRequiredForFacultyScope: "facultyId wajib diisi untuk scope FACULTY",
  studyProgramOutsideFaculty:
    "studyProgramId harus berada pada fakultas yang dipilih",
  facultyForbiddenForStudyProgramScope:
    "facultyId harus kosong untuk scope STUDY_PROGRAM",
  studyProgramRequiredForStudyProgramScope:
    "studyProgramId wajib diisi untuk scope STUDY_PROGRAM",
  singleSeatOccupied: "Posisi single-seat sudah terisi untuk scope ini",
} as const;
