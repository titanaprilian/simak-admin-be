import { prisma } from "@/libs/prisma";
import type { Prisma } from "@generated/prisma";
import type {
  CreateUserLecturerInput,
  UpdateUserLecturerInput,
  LecturerQuery,
} from "./schema";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";
import { RecordNotFoundError } from "@/libs/exceptions";

export const LecturerService = {
  getAll: async (params: LecturerQuery, log: Logger) => {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        studyProgramId: params.studyProgramId,
      },
      "Fetching lecturers list",
    );

    const { page, limit, search, studyProgramId } = params;
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { nidn: { contains: search, mode: "insensitive" } },
      ];
    }

    if (studyProgramId) {
      where.studyProgramId = studyProgramId;
    }

    const skip = (page - 1) * limit;

    const [lecturers, total] = await prisma.$transaction([
      prisma.lecturer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
              isActive: true,
              roleId: true,
              createdAt: true,
              updatedAt: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          studyProgram: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.lecturer.count({ where }),
    ]);

    log.info(
      { count: lecturers.length, total },
      "Lecturers retrieved successfully",
    );

    const lecturersWithStringDates = lecturers.map((lecturer) => ({
      ...lecturer,
      user: {
        ...lecturer.user,
        createdAt: lecturer.user.createdAt.toISOString(),
        updatedAt: lecturer.user.updatedAt.toISOString(),
      },
      createdAt: lecturer.createdAt.toISOString(),
      updatedAt: lecturer.updatedAt.toISOString(),
    }));

    return {
      lecturers: lecturersWithStringDates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getById: async (id: string, log: Logger) => {
    log.debug({ lecturerId: id }, "Fetching lecturer details");

    try {
      const lecturer = await prisma.lecturer.findUniqueOrThrow({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
              isActive: true,
              roleId: true,
              createdAt: true,
              updatedAt: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          studyProgram: {
            include: {
              faculty: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      log.info(
        {
          lecturerId: id,
          fullName: lecturer.fullName,
        },
        "Lecturer details retrieved successfully",
      );

      return {
        ...lecturer,
        user: {
          ...lecturer.user,
          createdAt: lecturer.user.createdAt.toISOString(),
          updatedAt: lecturer.user.updatedAt.toISOString(),
        },
        createdAt: lecturer.createdAt.toISOString(),
        updatedAt: lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  createWithUser: async (data: CreateUserLecturerInput, log: Logger) => {
    log.debug(
      { fullName: data.fullName, loginId: data.loginId },
      "Creating new user and lecturer",
    );

    try {
      const { nidn, fullName, gender, studyProgramId, ...userData } = data;
      const hashedPassword = await Bun.password.hash(userData.password);

      const result = await prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({
          where: { id: userData.roleId },
        });
        if (role?.name === "SuperAdmin") {
          log.warn(
            { loginId: userData.loginId, roleId: userData.roleId },
            "User creation blocked: Attempt to create SuperAdmin",
          );
          throw new Error("Cannot create SuperAdmin user");
        }

        const user = await tx.user.create({
          data: {
            ...userData,
            password: hashedPassword,
          },
          select: {
            id: true,
            loginId: true,
            email: true,
            isActive: true,
            roleId: true,
            createdAt: true,
            updatedAt: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        const lecturer = await tx.lecturer.create({
          data: {
            userId: user.id,
            nidn,
            fullName,
            gender,
            studyProgramId,
          },
        });

        return { user, lecturer };
      });

      log.info(
        { userId: result.user.id, lecturerId: result.lecturer.id },
        "User and lecturer created successfully",
      );

      return {
        ...result.lecturer,
        user: {
          ...result.user,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
        },
        createdAt: result.lecturer.createdAt.toISOString(),
        updatedAt: result.lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  updateWithUser: async (
    id: string,
    data: UpdateUserLecturerInput,
    log: Logger,
  ) => {
    log.debug({ lecturerId: id }, "Updating user and lecturer");

    try {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!lecturer) {
        throw new RecordNotFoundError("Lecturer not found");
      }

      const userUpdateData: any = {};
      const lecturerUpdateData: any = {};

      if (data.loginId !== undefined) userUpdateData.loginId = data.loginId;
      if (data.email !== undefined) userUpdateData.email = data.email;
      if (data.password !== undefined)
        userUpdateData.password = await Bun.password.hash(data.password);
      if (data.roleId !== undefined) userUpdateData.roleId = data.roleId;
      if (data.isActive !== undefined) userUpdateData.isActive = data.isActive;

      if (data.nidn !== undefined) lecturerUpdateData.nidn = data.nidn;
      if (data.fullName !== undefined)
        lecturerUpdateData.fullName = data.fullName;
      if (data.gender !== undefined) lecturerUpdateData.gender = data.gender;
      if (data.studyProgramId !== undefined)
        lecturerUpdateData.studyProgramId = data.studyProgramId;

      const result = await prisma.$transaction(async (tx) => {
        if (Object.keys(userUpdateData).length > 0) {
          const role = await tx.role.findUnique({
            where: { id: userUpdateData.roleId },
          });
          if (role?.name === "SuperAdmin") {
            log.warn(
              { lecturerId: id, roleId: userUpdateData.roleId },
              "User update blocked: Attempt to set SuperAdmin role",
            );
            throw new Error("Cannot assign SuperAdmin role");
          }

          if (userUpdateData.isActive === false) {
            const existingUser = await tx.user.findUnique({
              where: { id: lecturer.userId },
              include: { role: true },
            });
            if (existingUser?.role?.name === "SuperAdmin") {
              log.warn(
                { lecturerId: id },
                "User update blocked: Attempt to deactivate SuperAdmin",
              );
              throw new Error("Cannot deactivate SuperAdmin user");
            }
          }
        }

        const [user, updatedLecturer] = await Promise.all([
          Object.keys(userUpdateData).length > 0
            ? tx.user.update({
                where: { id: lecturer.userId },
                data: userUpdateData,
                select: {
                  id: true,
                  loginId: true,
                  email: true,
                  isActive: true,
                  roleId: true,
                  createdAt: true,
                  updatedAt: true,
                  role: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              })
            : tx.user.findUnique({
                where: { id: lecturer.userId },
                select: {
                  id: true,
                  loginId: true,
                  email: true,
                  isActive: true,
                  roleId: true,
                  createdAt: true,
                  updatedAt: true,
                  role: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              }),
          tx.lecturer.update({
            where: { id },
            data: lecturerUpdateData,
          }),
        ]);

        return { user: user!, lecturer: updatedLecturer };
      });

      log.info({ lecturerId: id }, "User and lecturer updated successfully");

      return {
        ...result.lecturer,
        user: {
          ...result.user!,
          createdAt: result.user!.createdAt.toISOString(),
          updatedAt: result.user!.updatedAt.toISOString(),
        },
        createdAt: result.lecturer.createdAt.toISOString(),
        updatedAt: result.lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  delete: async (id: string, log: Logger) => {
    log.debug({ lecturerId: id }, "Deleting lecturer and user");

    try {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!lecturer) {
        throw new RecordNotFoundError("Lecturer not found");
      }

      await prisma.$transaction(async (tx) => {
        await tx.lecturer.delete({
          where: { id },
        });

        await tx.user.delete({
          where: { id: lecturer.userId },
        });
      });

      log.info({ lecturerId: id }, "Lecturer and user deleted successfully");

      return { id };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  getOptions: async (
    params: { page: number; limit: number; search?: string },
    log: Logger,
  ) => {
    log.debug(
      { page: params.page, limit: params.limit, search: params.search },
      "Fetching lecturer options",
    );

    const { page, limit, search } = params;
    const where: Prisma.LecturerWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { nidn: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const skip = (page - 1) * limit;

    const [lecturers, total] = await prisma.$transaction([
      prisma.lecturer.findMany({
        where,
        select: { id: true, fullName: true, nidn: true },
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
      }),
      prisma.lecturer.count({ where }),
    ]);

    log.info(
      { count: lecturers.length, total },
      "Lecturer options retrieved successfully",
    );

    return {
      lecturers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
