export const es = {
  success: "Éxito",
  error: "Error",
  badRequest: "Solicitud incorrecta",
  badRequestWithField: "Referencia inválida: {{field}} no existe.",
  unauthorized: "No autorizado",
  forbidden: "Prohibido",
  notFound: "No encontrado",
  internalServerError: "Error interno del servidor",
  duplicateField: "Valor duplicado para campo único: {{target}}",
  invalidReference: "Referencia inválida: '{{fieldName}}' no existe.",
  duplicate: "Valor duplicado para campo único: {{field}}",
} as const;

export const validation = {
  required: "{{field}} es requerido",
  email: "{{field}} debe ser un email válido",
  minLength: "{{field}} debe tener al menos {{min}} caracteres",
  maxLength: "{{field}} debe tener como máximo {{max}} caracteres",
  min: "{{field}} debe ser al menos {{min}}",
  max: "{{field}} debe ser como máximo {{max}}",
  oneOf: "{{field}} debe ser uno de: {{values}}",
  invalidType: "{{field}} debe ser de tipo {{type}}",
  invalidEnum: "{{field}} debe ser uno de: {{values}}",
} as const;

export type CommonLocale = typeof es;
export type ValidationLocale = typeof validation;
