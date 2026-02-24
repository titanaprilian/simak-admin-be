export const es = {
  listSuccess: "Posiciones recuperadas exitosamente",
  createSuccess: "Posición creada exitosamente",
  updateSuccess: "Posición actualizada exitosamente",
  deleteSuccess: "Posición eliminada exitosamente",

  assignmentListSuccess: "Asignaciones de posición recuperadas exitosamente",
  assignmentCreateSuccess: "Asignación de posición creada exitosamente",
  assignmentUpdateSuccess: "Asignación de posición actualizada exitosamente",
  assignmentDeleteSuccess: "Asignación de posición eliminada exitosamente",

  invalidAssignment: "Carga de asignación de posición inválida",
  invalidStartDate: "Fecha de inicio inválida",
  invalidDateRange:
    "La fecha de finalización debe ser mayor o igual a la fecha de inicio",
  positionNotFound: "Posición no encontrada",
  facultyRequiredForFacultyScope:
    "facultyId es requerido para el alcance FACULTY",
  studyProgramOutsideFaculty:
    "studyProgramId debe pertenecer a la facultad seleccionada",
  facultyForbiddenForStudyProgramScope:
    "facultyId debe estar vacío para el alcance STUDY_PROGRAM",
  studyProgramRequiredForStudyProgramScope:
    "studyProgramId es requerido para el alcance STUDY_PROGRAM",
  singleSeatOccupied:
    "La posición de asiento único ya está ocupada para este alcance",
} as const;
