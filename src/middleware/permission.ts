import { prisma } from "@/libs/prisma";
import { errorResponse } from "@/libs/response";

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "print";

/**
 * Middleware Factory: Checks if the user has specific access to a feature.
 * Usage: .get('/', Handler, { beforeHandle: hasPermission('User', 'read') })
 */
export const hasPermission = (
  featureName: string,
  action: PermissionAction,
) => {
  return async ({ user, set }: any) => {
    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      select: { roleId: true },
    });

    if (!userWithRole?.roleId) {
      return errorResponse(set, 403, "Forbidden: User has no role assigned");
    }

    // We explicitly check the boolean column for the requested action
    const permission = await prisma.roleFeature.findFirst({
      where: {
        roleId: userWithRole.roleId,
        feature: {
          name: featureName,
        },
        [getColumnName(action)]: true,
      },
    });

    if (!permission) {
      return errorResponse(
        set,
        403,
        `Forbidden: You do not have '${action}' permission for '${featureName}'`,
      );
    }
  };
};

const getColumnName = (action: PermissionAction) => {
  switch (action) {
    case "create":
      return "canCreate";
    case "read":
      return "canRead";
    case "update":
      return "canUpdate";
    case "delete":
      return "canDelete";
    case "print":
      return "canPrint";
    default:
      throw new Error("Invalid permission action");
  }
};
