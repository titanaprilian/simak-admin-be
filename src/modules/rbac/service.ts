import { prisma } from "@/libs/prisma";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  CreateFeatureInput,
  UpdateFeatureInput,
} from "./schema";
import {
  DeleteSystemError,
  ForeignKeyError,
  InvalidFeatureIdError,
  RecordNotFoundError,
  UniqueConstraintError,
  UpdateSystemError,
} from "./error";
import { Prisma } from "@generated/prisma";
import type { Logger } from "pino";

function handlePrismaError(error: unknown, log: Logger): never {
  const prismaError = error as {
    code?: string;
    meta?: Record<string, unknown>;
  };

  if (prismaError.code) {
    log.warn(
      { code: prismaError.code, meta: prismaError.meta },
      "Prisma error occurred",
    );

    if (prismaError.code === "P2003") {
      const rawField = (prismaError.meta?.field_name as string) || "unknown";
      const match = rawField.match(/_([a-zA-Z0-9]+)_fkey/);
      const fieldName = match ? match[1] : rawField;
      throw new ForeignKeyError(fieldName);
    }

    if (prismaError.code === "P2002") {
      const target =
        (prismaError.meta?.target as string[])?.join(", ") || "field";
      throw new UniqueConstraintError(target);
    }

    if (prismaError.code === "P2025") {
      throw new RecordNotFoundError();
    }
  }
  log.error({ error }, "Unexpected error in service layer");
  throw error;
}

// 🔒 Define system critical features and roles that cannot be touched
const PROTECTED_FEATURES = ["RBAC_management"];
const PROTECTED_ROLES = ["SuperAdmin"];

export const RbacService = {
  /**
   * =========================================
   * FEATURES (Resources)
   * Standard CRUD operations
   * =========================================
   */
  getAllFeatures: async (
    params: {
      page: number;
      limit: number;
      search?: string;
    },
    log: Logger,
  ) => {
    log.debug(
      { page: params.page, limit: params.limit, search: params.search },
      "Fetching features list",
    );

    const { page, limit, search } = params;
    const where: Prisma.FeatureWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Calculate Skip
    const skip = (page - 1) * limit;

    const [features, total] = await prisma.$transaction([
      prisma.feature.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.feature.count({ where }),
    ]);

    log.info(
      { count: features.length, total },
      "Features retrieved successfully",
    );

    // Convert Date objects to ISO strings
    const featuresWithStringDates = features.map((feature) => ({
      ...feature,
      createdAt: feature.createdAt.toISOString(),
      updatedAt: feature.updatedAt.toISOString(),
    }));

    return {
      features: featuresWithStringDates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  createFeature: async (data: CreateFeatureInput, log: Logger) => {
    log.debug({ name: data.name }, "Creating new feature");
    const { defaultPermissions, ...featureData } = data;

    try {
      return await prisma.$transaction(async (tx) => {
        const newFeature = await tx.feature.create({
          data: featureData,
        });

        log.info(
          { featureId: newFeature.id, name: newFeature.name },
          "Feature created successfully",
        );

        if (defaultPermissions) {
          const allRoles = await tx.role.findMany({
            select: { id: true, name: true },
          });

          if (allRoles.length > 0) {
            const roleFeaturesData = allRoles.map((role) => {
              const isAdmin = role.name.toLowerCase().includes("admin");
              if (isAdmin) {
                return {
                  roleId: role.id,
                  featureId: newFeature.id,
                  canCreate: true,
                  canRead: true,
                  canUpdate: true,
                  canDelete: true,
                  canPrint: true,
                };
              }

              return {
                roleId: role.id,
                featureId: newFeature.id,
                ...defaultPermissions,
              };
            });

            await tx.roleFeature.createMany({
              data: roleFeaturesData,
            });

            log.info(
              { featureId: newFeature.id, roleCount: allRoles.length },
              "Default permissions assigned to roles",
            );
          }
        }

        return {
          ...newFeature,
          createdAt: newFeature.createdAt.toISOString(),
          updatedAt: newFeature.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  updateFeature: async (id: string, data: UpdateFeatureInput, log: Logger) => {
    log.debug({ featureId: id }, "Updating feature");

    try {
      const updatedFeature = await prisma.feature.update({
        where: { id },
        data,
      });

      log.info(
        { featureId: id, name: updatedFeature.name },
        "Feature updated successfully",
      );

      return {
        ...updatedFeature,
        createdAt: updatedFeature.createdAt.toISOString(),
        updatedAt: updatedFeature.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  deleteFeature: async (id: string, log: Logger) => {
    log.debug({ featureId: id }, "Attempting to delete feature");

    try {
      const feature = await prisma.feature.findUniqueOrThrow({
        where: { id },
      });

      if (PROTECTED_FEATURES.includes(feature.name)) {
        log.warn(
          { featureId: id, name: feature.name },
          "Delete blocked: Protected system feature",
        );
        throw new DeleteSystemError();
      }

      const deletedFreature = await prisma.feature.delete({
        where: { id },
      });

      log.info(
        { featureId: id, name: deletedFreature.name },
        "Feature deleted successfully",
      );

      return {
        ...deletedFreature,
        createdAt: deletedFreature.createdAt.toISOString(),
        updatedAt: deletedFreature.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  /**
   * =========================================
   * ROLES (with Permissions)
   * Complex CRUD handling relations
   * =========================================
   */
  getAllRoles: async (
    params: {
      page: number;
      limit: number;
      search?: string;
      feature?: string;
    },
    log: Logger,
  ) => {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        feature: params.feature,
      },
      "Fetching roles list",
    );

    const { page, limit, search, feature } = params;
    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.name = { contains: search };
    }

    if (feature) {
      where.permissions = {
        some: {
          feature: {
            name: { contains: feature },
          },
        },
      };
    }

    // Calculate Skip
    const skip = (page - 1) * limit;

    const [roles, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.role.count({ where }),
    ]);

    log.info({ count: roles.length, total }, "Roles retrieved successfully");

    // Convert Date objects to ISO strings
    const roleWithStringDates = roles.map((role) => ({
      ...role,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }));

    return {
      roles: roleWithStringDates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getRoleOptions: async (
    params: {
      page: number;
      limit: number;
      search?: string;
    },
    log: Logger,
  ) => {
    log.debug(
      { page: params.page, limit: params.limit, search: params.search },
      "Fetching role options",
    );

    const { page, limit, search } = params;
    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.name = { contains: search };
    }

    const skip = (page - 1) * limit;

    const [roles, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        select: { id: true, name: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.role.count({ where }),
    ]);

    log.info(
      { count: roles.length, total },
      "Role options retrieved successfully",
    );

    return {
      roles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getRole: async (id: string, log: Logger) => {
    log.debug({ roleId: id }, "Fetching role details");

    try {
      const role = await prisma.role.findUniqueOrThrow({
        where: { id },
        include: {
          permissions: {
            include: {
              feature: {
                select: { id: true, name: true },
              },
            },
            orderBy: {
              feature: {
                name: "asc",
              },
            },
          },
        },
      });

      log.info(
        {
          roleId: id,
          name: role.name,
          permissionCount: role.permissions.length,
        },
        "Role details retrieved successfully",
      );

      return {
        ...role,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  createRole: async (data: CreateRoleInput, log: Logger) => {
    log.debug({ name: data.name }, "Creating new role");

    try {
      return await prisma.$transaction(async (tx) => {
        // Validate featureIds if permissions are provided
        if (data.permissions && data.permissions.length > 0) {
          const featureIds = data.permissions.map((p) => p.featureId);
          const existingFeatures = await tx.feature.findMany({
            where: { id: { in: featureIds } },
            select: { id: true },
          });
          const existingFeatureIds = new Set(existingFeatures.map((f) => f.id));
          const invalidFeatureIds = featureIds.filter(
            (id) => !existingFeatureIds.has(id),
          );
          if (invalidFeatureIds.length > 0) {
            log.warn(
              { invalidFeatureIds: invalidFeatureIds.join(", ") },
              "Role creation failed: Invalid feature IDs",
            );
            throw new InvalidFeatureIdError(
              "Invalid featureId(s): " + invalidFeatureIds.join(", "),
            );
          }
        }

        // Create the Role first
        const role = await tx.role.create({
          data: {
            name: data.name,
            description: data.description,
          },
        });

        log.info(
          { roleId: role.id, name: role.name },
          "Role created successfully",
        );

        // Fetch ALL system features
        // We need this list to guarantee we create a permission entry for every single feature
        const allFeatures = await tx.feature.findMany({ select: { id: true } });

        // Create a Lookup Map for incoming permissions (for faster matching)
        const providedPermsMap = new Map(
          (data.permissions || []).map((p) => [p.featureId, p]),
        );

        // We map over ALL features, not just the ones provided in the request
        const roleFeaturesData = allFeatures.map((feature) => {
          const provided = providedPermsMap.get(feature.id);

          return {
            roleId: role.id,
            featureId: feature.id,
            canCreate: provided?.canCreate ?? false,
            canRead: provided?.canRead ?? false,
            canUpdate: provided?.canUpdate ?? false,
            canDelete: provided?.canDelete ?? false,
            canPrint: provided?.canPrint ?? false,
          };
        });

        // Bulk Insert Permissions
        if (roleFeaturesData.length > 0) {
          await tx.roleFeature.createMany({
            data: roleFeaturesData,
          });
          log.info(
            { roleId: role.id, permissionCount: roleFeaturesData.length },
            "Permissions assigned to role",
          );
        }

        const newRole = await tx.role.findUniqueOrThrow({
          where: { id: role.id },
          include: {
            permissions: {
              include: {
                feature: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        });

        return {
          ...newRole,
          createdAt: newRole.createdAt.toISOString(),
          updatedAt: newRole.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  updateRole: async (id: string, data: UpdateRoleInput, log: Logger) => {
    log.debug({ roleId: id }, "Updating role");

    try {
      const roleToCheck = await prisma.role.findUniqueOrThrow({
        where: { id },
        select: { name: true },
      });

      if (PROTECTED_ROLES.includes(roleToCheck.name)) {
        log.warn(
          { roleId: id, name: roleToCheck.name },
          "Update blocked: Protected system role",
        );
        throw new UpdateSystemError();
      }
      const { permissions, ...roleDetails } = data;

      return await prisma.$transaction(async (tx) => {
        await tx.role.update({
          where: { id },
          data: roleDetails,
        });

        if (permissions) {
          await tx.roleFeature.deleteMany({
            where: { roleId: id },
          });

          if (permissions.length > 0) {
            await tx.roleFeature.createMany({
              data: permissions.map((p) => ({
                roleId: id,
                featureId: p.featureId,
                canCreate: p.canCreate,
                canRead: p.canRead,
                canUpdate: p.canUpdate,
                canDelete: p.canDelete,
                canPrint: p.canPrint,
              })),
            });
            log.info(
              { roleId: id, permissionCount: permissions.length },
              "Permissions updated for role",
            );
          }
        }

        const updatedRole = await tx.role.findUniqueOrThrow({
          where: { id },
          include: {
            permissions: {
              include: { feature: true },
            },
          },
        });

        log.info(
          { roleId: id, name: updatedRole.name },
          "Role updated successfully",
        );

        return {
          ...updatedRole,
          createdAt: updatedRole.createdAt.toISOString(),
          updatedAt: updatedRole.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  getMyRole: async (userId: string, log: Logger) => {
    log.debug({ userId }, "Fetching current user role and permissions");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                feature: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    log.info(
      {
        userId,
        roleName: user.role.name,
        permissionCount: user.role.permissions.length,
      },
      "User role retrieved successfully",
    );

    return {
      roleName: user.role.name,
      permissions: user.role.permissions.map((p) => ({
        featureId: p.feature.id,
        featureName: p.feature.name,
        canCreate: p.canCreate,
        canRead: p.canRead,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
        canPrint: p.canPrint,
      })),
    };
  },

  deleteRole: async (id: string, log: Logger) => {
    log.debug({ roleId: id }, "Attempting to delete role");

    try {
      const role = await prisma.role.findUniqueOrThrow({
        where: { id },
      });

      if (PROTECTED_ROLES.includes(role.name)) {
        log.warn(
          { roleId: id, name: role.name },
          "Delete blocked: Protected system role",
        );
        throw new DeleteSystemError();
      }

      const deletedRole = await prisma.role.delete({
        where: { id },
      });

      log.info(
        { roleId: id, name: deletedRole.name },
        "Role deleted successfully",
      );

      return {
        ...deletedRole,
        createdAt: deletedRole.createdAt.toISOString(),
        updatedAt: deletedRole.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },
};
