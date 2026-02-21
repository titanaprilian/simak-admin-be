export const en = {
  createSuccess: "User Succesfully Created",
  updateSuccess: "User updated successfully",
  deleteSuccess: "User Successfully Deleted",
  getSuccess: "User details retrieved",
  listSuccess: "Users retrieved successfully",
  userNotFound: "User Not Found",
  deleteSelf: "Operation Forbidden: You cannot delete your own account",
  createSystemAdmin:
    "Operation Forbidden: You cannot create user with SuperAdmin role more than one",
  updateSystemAdmin:
    "Operation Forbidden: You cannot update user status to inactive with SuperAdmin role",
  invalidRole: "Invalid role",
  cannotDisableOwnAccount: "You cannot disable your own account",
} as const;

export type UserLocale = typeof en;
