export const es = {
  listSuccess: "Términos académicos recuperados con éxito",
  getSuccess: "Términos académicos recuperados con éxito",
  createSuccess: "Término académico creado con éxito",
  updateSuccess: "Término académico actualizado con éxito",
  deleteSuccess: "Término académico eliminado con éxito",
  notFound: "Término académico no encontrado",
  invalidDate:
    "La fecha de inicio debe ser anterior a la fecha de finalización",
  activeSwitched: "El término académico activo ha sido cambiado",
} as const;

export type UserLocale = typeof es;
