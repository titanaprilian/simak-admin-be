export const id = {
  success: "Berhasil",
  error: "Kesalahan",
  badRequest: "Permintaan Buruk",
  badRequestWithField: "Referensi tidak valid: {{field}} tidak ada.",
  unauthorized: "Tidak Dizinkan",
  forbidden: "Dilarang",
  notFound: "Tidak Ditemukan",
  internalServerError: "Kesalahan Server Internal",
  duplicateField: "Nilai duplikat untuk bidang unik: {{target}}",
  invalidReference: "Referensi tidak valid: '{{fieldName}}' tidak ada.",
  duplicate: "Nilai duplikat untuk bidang unik: {{field}}",
} as const;

export const validation = {
  required: "{{field}} wajib diisi",
  email: "{{field}} harus berupa email yang valid",
  minLength: "{{field}} harus memiliki setidaknya {{min}} karakter",
  maxLength: "{{field}} harus memiliki paling banyak {{max}} karakter",
  min: "{{field}} harus setidaknya {{min}}",
  max: "{{field}} harus paling banyak {{max}}",
  oneOf: "{{field}} harus salah satu dari: {{values}}",
  invalidType: "{{field}} harus berupa tipe {{type}}",
  invalidEnum: "{{field}} harus salah satu dari: {{values}}",
} as const;

export type CommonLocale = typeof id;
export type ValidationLocale = typeof validation;
