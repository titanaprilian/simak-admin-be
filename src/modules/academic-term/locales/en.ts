export const en = {
  listSuccess: "Academic terms retrieved successfully",
  getSuccess: "Academic terms retrieved successfully",
  createSuccess: "Academic term created successfully",
  updateSuccess: "Academic term updated successfully",
  deleteSuccess: "Academic term deleted successfully",
  notFound: "Academic term not found",
  invalidDate: "Start date must be before end date",
  activeSwitched: "The active academic term has been switched",
} as const;

export type UserLocale = typeof en;
