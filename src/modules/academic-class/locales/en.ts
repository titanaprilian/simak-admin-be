export const en = {
  listSuccess: "Academic classes retrieved successfully",
  createSuccess: "Academic class created successfully",
  updateSuccess: "Academic class updated successfully",
  deleteSuccess: "Academic class deleted successfully",
  getSuccess: "Academic class details retrieved",
  getByIdSuccess: "Academic class retrieved successfully",
  bulkCreateSuccess: "Academic classes created successfully",
  notFound: "Academic class not found",
  duplicate:
    "Academic class with this name already exists for the given study program and year",
  studyProgramNotFound: "Study program not found",
  lecturerNotFound: "Lecturer not found",
  invalidStudyProgram: "Invalid study program",
} as const;

export type AcademicClassLocale = typeof en;
