export const en = {
  listSuccess: "Positions retrieved successfully",
  createSuccess: "Position created successfully",
  updateSuccess: "Position updated successfully",
  deleteSuccess: "Position deleted successfully",

  assignmentListSuccess: "Position assignments retrieved successfully",
  assignmentCreateSuccess: "Position assignment created successfully",
  assignmentUpdateSuccess: "Position assignment updated successfully",
  assignmentDeleteSuccess: "Position assignment deleted successfully",

  invalidAssignment: "Invalid position assignment payload",
  invalidStartDate: "Invalid start date",
  invalidDateRange: "End date must be greater than or equal to start date",
  positionNotFound: "Position not found",
  facultyRequiredForFacultyScope: "facultyId is required for FACULTY scope",
  studyProgramOutsideFaculty:
    "studyProgramId must belong to the selected faculty",
  facultyForbiddenForStudyProgramScope:
    "facultyId must be empty for STUDY_PROGRAM scope",
  studyProgramRequiredForStudyProgramScope:
    "studyProgramId is required for STUDY_PROGRAM scope",
  singleSeatOccupied: "Single-seat position is already occupied for this scope",
} as const;
