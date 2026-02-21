export const common = {
  success: "Success",
  error: "Error",
  badRequest: "Bad Request",
  badRequestWithField: "Invalid Reference: The {{field}} does not exist.",
  unauthorized: "Unauthorized",
  forbidden: "Forbidden",
  notFound: "Resource not found",
  internalServerError: "Internal Server Error",
  duplicateField: "Duplicate value for unique field: {{target}}",
  invalidReference: "Invalid Reference: The '{{fieldName}}' does not exist.",
  duplicate: "Duplicate value for unique field: {{field}}",
} as const;

export const validation = {
  required: "{{field}} is required",
  email: "{{field}} must be a valid email",
  minLength: "{{field}} must be at least {{min}} characters",
  maxLength: "{{field}} must be at most {{max}} characters",
  min: "{{field}} must be at least {{min}}",
  max: "{{field}} must be at most {{max}}",
  oneOf: "{{field}} must be one of: {{values}}",
  invalidType: "{{field}} must be of type {{type}}",
  invalidEnum: "{{field}} must be one of: {{values}}",
} as const;

export type CommonLocale = typeof common;
export type ValidationLocale = typeof validation;
