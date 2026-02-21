import { prisma } from "@/libs/prisma";
import type { CreateUserInput, UpdateUserInput } from "./schema";
import { CreateSystemError, DeleteSelfError, UpdateSystemError } from "./error";
import { DeleteSystemError } from "../rbac/error";
import { Prisma } from "@generated/prisma";
import type { Logger } from "pino";

export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,
} as const;

// User that have this roles can't be deleted
const PROTECTED_ROLES = ["SuperAdmin"];

export abstract class UserService {
  static async getUsers(
    params: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
      roleId?: string;
    },
    log: Logger,
  ) {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        isActive: params.isActive,
        roleId: params.roleId,
      },
      "Fetching users list",
    );

    const { page, limit, search, isActive, roleId } = params;

    const where: Prisma.UserWhereInput = {};

    // Filter: Role
    if (roleId) {
      where.roleId = roleId;
    }

    // Filter: isActive
    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    // Filter: Search (Name OR Email)
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Calculate Skip
    const skip = (page - 1) * limit;

    // Execute Transaction
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          ...SAFE_USER_SELECT,
          role: {
            select: {
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    log.info({ count: users.length, total }, "Users retrieved successfully");

    // Convert Date objects to ISO strings
    const userWithStringDates = users.map((user) => ({
      ...user,
      roleName: user.role?.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return {
      users: userWithStringDates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createUser(
    data: CreateUserInput,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug({ email: data.email, roleId: data.roleId }, "Creating new user");

    // 🛡️ SECURITY CHECK: Duplicate SuperAdmin
    // If the user being created is a SuperAdmin, BLOCK IT. We need to make sure SuperAdmin is only one
    const role = await prisma.role.findUnique({
      where: {
        id: data.roleId,
      },
    });
    if (role?.name === "SuperAdmin") {
      log.warn(
        { email: data.email, roleId: data.roleId },
        "User creation blocked: Attempt to create duplicate SuperAdmin",
      );
      throw new CreateSystemError(locale);
    }

    const hashedPassword = await Bun.password.hash(data.password);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: SAFE_USER_SELECT,
    });

    log.info(
      { userId: user.id, email: user.email, roleId: user.roleId },
      "User created successfully",
    );

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static async getUser(id: string, log: Logger) {
    log.debug({ userId: id }, "Fetching user details");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        ...SAFE_USER_SELECT,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    log.info(
      { userId: id, email: user.email, roleName: user.role?.name },
      "User details retrieved successfully",
    );

    return {
      ...user,
      roleName: user.role?.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static async updateUser(
    id: string,
    data: UpdateUserInput,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug({ userId: id }, "Updating user");

    const updateData = { ...data };
    if (updateData.password) {
      updateData.password = await Bun.password.hash(updateData.password);
    }

    // 🛡️ SECURITY CHECK: Inactive SuperAdmin
    // If the user update the status field to inactive and the user is a SuperAdmin, BLOCK IT.
    if (updateData.isActive === false) {
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { role: { select: { name: true } } },
      });

      if (existingUser?.role?.name === "SuperAdmin") {
        log.warn(
          { userId: id },
          "User update blocked: Attempt to deactivate SuperAdmin",
        );
        throw new UpdateSystemError(locale);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      select: SAFE_USER_SELECT,
      data: updateData,
    });

    log.info({ userId: id, email: user.email }, "User updated successfully");

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static async deleteUser(
    targetId: string,
    requestingUserId: string,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug(
      { targetUserId: targetId, requestingUserId },
      "Attempting to delete user",
    );

    // 🛡️ SECURITY CHECK: Suicide Prevention
    if (targetId === requestingUserId) {
      log.warn(
        { targetUserId: targetId },
        "User deletion blocked: Self-deletion attempt",
      );
      throw new DeleteSelfError(locale);
    }

    // Fetch user + Role to check permissions
    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: targetId },
      include: { role: true },
    });

    // 🛡️ SECURITY CHECK: Protected User
    // If the user being deleted is a SuperAdmin, BLOCK IT.
    if (targetUser.role && PROTECTED_ROLES.includes(targetUser.role.name)) {
      log.warn(
        { targetUserId: targetId, roleName: targetUser.role.name },
        "User deletion blocked: Protected SuperAdmin user",
      );
      throw new DeleteSystemError(
        "Cannot delete a user with SuperAdmin privileges.",
      );
    }

    // Safe to delete
    const user = await prisma.user.delete({
      where: { id: targetId },
      select: SAFE_USER_SELECT,
    });

    log.info(
      { userId: targetId, email: user.email },
      "User deleted successfully",
    );

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
