export const es = {
  listSuccess: "Clases académicas recuperadas exitosamente",
  createSuccess: "Clase académica creada exitosamente",
  updateSuccess: "Clase académica actualizada exitosamente",
  deleteSuccess: "Clase académica eliminada exitosamente",
  getSuccess: "Detalles de clase académica recuperados",
  getByIdSuccess: "Clase académica recuperada exitosamente",
  bulkCreateSuccess: "Clases académicas creadas exitosamente",
  notFound: "Clase académica no encontrada",
  duplicate:
    "Ya existe una clase académica con este nombre para el programa de estudios y año dados",
  studyProgramNotFound: "Programa de estudios no encontrado",
  lecturerNotFound: "Profesor no encontrado",
  invalidStudyProgram: "Programa de estudios inválido",
} as const;

export type AcademicClassLocale = typeof es;
