import { prisma } from "@/libs/prisma";
import type {
  CreateUserPositionInput,
  UpdateUserPositionInput,
  UserPositionQuery,
} from "./schema";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";
import {
  UserPositionNotFoundError,
  PositionAssignmentValidationError,
  CreateSuperAdminError,
  UpdateSuperAdminError,
  DeactivateSuperAdminError,
} from "./error";
import { Prisma } from "@generated/prisma";

const parseDateInput = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function validatePositionAssignment(
  params: {
    positionId: string;
    facultyId: string | null;
    studyProgramId: string | null;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    excludeId?: string;
  },
  log: Logger,
) {
  const {
    positionId,
    facultyId,
    studyProgramId,
    startDate,
    endDate,
    isActive,
  } = params;

  if (endDate && endDate < startDate) {
    throw new PositionAssignmentValidationError(
      "End date must be greater than or equal to start date",
    );
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: {
      id: true,
      scopeType: true,
      isSingleSeat: true,
    },
  });

  if (!position) {
    throw new PositionAssignmentValidationError("Position not found");
  }

  if (position.scopeType === "FACULTY") {
    if (!facultyId) {
      throw new PositionAssignmentValidationError(
        "facultyId is required for FACULTY scope position",
      );
    }

    if (studyProgramId && facultyId) {
      const studyProgram = await prisma.studyProgram.findUnique({
        where: { id: studyProgramId },
        select: { facultyId: true },
      });

      if (!studyProgram || studyProgram.facultyId !== facultyId) {
        throw new PositionAssignmentValidationError(
          "studyProgramId must belong to the selected faculty",
        );
      }
    }
  }

  if (position.scopeType === "STUDY_PROGRAM") {
    if (facultyId) {
      throw new PositionAssignmentValidationError(
        "facultyId must be empty for STUDY_PROGRAM scope position",
      );
    }

    if (!studyProgramId) {
      throw new PositionAssignmentValidationError(
        "studyProgramId is required for STUDY_PROGRAM scope position",
      );
    }
  }

  if (position.isSingleSeat && isActive) {
    const where: Prisma.PositionAssignmentWhereInput = {
      positionId,
      isActive: true,
      id: params.excludeId ? { not: params.excludeId } : undefined,
    };

    if (position.scopeType === "FACULTY") {
      where.facultyId = facultyId;
    }

    if (position.scopeType === "STUDY_PROGRAM") {
      where.studyProgramId = studyProgramId;
    }

    const occupied = await prisma.positionAssignment.findFirst({
      where,
      select: { id: true },
    });

    if (occupied) {
      log.warn(
        {
          positionId,
          facultyId,
          studyProgramId,
          occupiedAssignmentId: occupied.id,
        },
        "Single-seat position already occupied",
      );
      throw new PositionAssignmentValidationError(
        "Single-seat position is already occupied for this scope",
      );
    }
  }
}

export const UserPositionService = {
  getAll: async (params: UserPositionQuery, log: Logger) => {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        studyProgramId: params.studyProgramId,
        positionId: params.positionId,
        isActive: params.isActive,
      },
      "Fetching user positions list",
    );

    const { page, limit, search, studyProgramId, positionId, isActive } =
      params;

    const where: Prisma.LecturerWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { nidn: { contains: search, mode: "insensitive" } },
        { user: { loginId: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (studyProgramId) {
      where.studyProgramId = studyProgramId;
    }

    if (positionId || isActive !== undefined) {
      const userFilter: Prisma.UserWhereInput = {
        positions: {
          some: {
            ...(positionId && { positionId }),
            ...(isActive !== undefined && { isActive }),
          },
        },
      };
      where.user = userFilter;
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
              positions: {
                where: {
                  ...(positionId && { positionId }),
                  ...(isActive !== undefined && { isActive }),
                },
                orderBy: { isActive: "desc" },
                take: 1,
                include: {
                  position: {
                    select: {
                      id: true,
                      name: true,
                      scopeType: true,
                      isSingleSeat: true,
                    },
                  },
                  faculty: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
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
      "User positions retrieved successfully",
    );

    const transformed = lecturers.map((lecturer) => {
      const positionAssignment = lecturer.user.positions[0];
      return {
        ...lecturer,
        positionAssignment: positionAssignment
          ? {
              ...positionAssignment,
              startDate: positionAssignment.startDate.toISOString(),
              endDate: positionAssignment.endDate?.toISOString() || null,
              createdAt: positionAssignment.createdAt.toISOString(),
              updatedAt: positionAssignment.updatedAt.toISOString(),
            }
          : null,
        user: {
          ...lecturer.user,
          createdAt: lecturer.user.createdAt.toISOString(),
          updatedAt: lecturer.user.updatedAt.toISOString(),
        },
        createdAt: lecturer.createdAt.toISOString(),
        updatedAt: lecturer.updatedAt.toISOString(),
      };
    });

    return {
      userPositions: transformed,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getById: async (id: string, log: Logger) => {
    log.debug({ lecturerId: id }, "Fetching user position details");

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
              positions: {
                orderBy: { isActive: "desc" },
                take: 1,
                include: {
                  position: {
                    select: {
                      id: true,
                      name: true,
                      scopeType: true,
                      isSingleSeat: true,
                    },
                  },
                  faculty: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
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

      const positionAssignment = lecturer.user.positions[0];

      log.info(
        {
          lecturerId: id,
          fullName: lecturer.fullName,
        },
        "User position details retrieved successfully",
      );

      return {
        ...lecturer,
        positionAssignment: positionAssignment
          ? {
              ...positionAssignment,
              startDate: positionAssignment.startDate.toISOString(),
              endDate: positionAssignment.endDate?.toISOString() || null,
              createdAt: positionAssignment.createdAt.toISOString(),
              updatedAt: positionAssignment.updatedAt.toISOString(),
            }
          : null,
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

  create: async (data: CreateUserPositionInput, log: Logger) => {
    log.debug(
      {
        loginId: data.loginId,
        fullName: data.fullName,
        positionId: data.positionId,
      },
      "Creating new user, lecturer and position assignment",
    );

    try {
      const {
        nidn,
        fullName,
        gender,
        studyProgramId,
        positionId,
        facultyId,
        startDate,
        endDate,
        isActivePosition,
        ...userData
      } = data;

      const parsedStartDate = parseDateInput(startDate);
      const parsedEndDate = parseDateInput(endDate);

      if (!parsedStartDate) {
        throw new PositionAssignmentValidationError("Invalid start date");
      }

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
          throw new CreateSuperAdminError();
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

        await validatePositionAssignment(
          {
            positionId,
            facultyId: facultyId || null,
            studyProgramId: studyProgramId,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            isActive: isActivePosition ?? true,
          },
          log,
        );

        const positionAssignment = await tx.positionAssignment.create({
          data: {
            userId: user.id,
            positionId,
            facultyId: facultyId || null,
            studyProgramId: studyProgramId,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            isActive: isActivePosition ?? true,
          },
          include: {
            position: {
              select: {
                id: true,
                name: true,
                scopeType: true,
                isSingleSeat: true,
              },
            },
            faculty: {
              select: {
                id: true,
                code: true,
                name: true,
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
        });

        return { user, lecturer, positionAssignment };
      });

      log.info(
        {
          userId: result.user.id,
          lecturerId: result.lecturer.id,
          positionAssignmentId: result.positionAssignment.id,
        },
        "User, lecturer and position assignment created successfully",
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

  update: async (id: string, data: UpdateUserPositionInput, log: Logger) => {
    log.debug(
      { lecturerId: id },
      "Updating user, lecturer and position assignment",
    );

    try {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              positions: {
                orderBy: { isActive: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (!lecturer) {
        throw new UserPositionNotFoundError();
      }

      const userUpdateData: Record<string, unknown> = {};
      const lecturerUpdateData: Record<string, unknown> = {};
      const positionAssignmentUpdateData: Record<string, unknown> = {};

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

      const currentPositionAssignment = lecturer.user.positions[0];

      if (data.positionId !== undefined) {
        positionAssignmentUpdateData.positionId = data.positionId;
      }
      if (data.facultyId !== undefined) {
        positionAssignmentUpdateData.facultyId = data.facultyId || null;
      }
      if (data.startDate !== undefined) {
        const parsed = parseDateInput(data.startDate);
        if (parsed) positionAssignmentUpdateData.startDate = parsed;
      }
      if (data.endDate !== undefined) {
        const parsed = parseDateInput(data.endDate);
        positionAssignmentUpdateData.endDate = parsed;
      }
      if (data.isActivePosition !== undefined) {
        positionAssignmentUpdateData.isActive = data.isActivePosition;
      }

      const result = await prisma.$transaction(async (tx) => {
        if (userUpdateData.roleId) {
          const role = await tx.role.findUnique({
            where: { id: userUpdateData.roleId as string },
          });
          if (role?.name === "SuperAdmin") {
            log.warn(
              { lecturerId: id, roleId: userUpdateData.roleId },
              "User update blocked: Attempt to set SuperAdmin role",
            );
            throw new UpdateSuperAdminError();
          }
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
            throw new DeactivateSuperAdminError();
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

        let positionAssignment = null;
        if (
          currentPositionAssignment &&
          Object.keys(positionAssignmentUpdateData).length > 0
        ) {
          const finalPayload = {
            positionId: data.positionId ?? currentPositionAssignment.positionId,
            facultyId:
              data.facultyId !== undefined
                ? data.facultyId || null
                : currentPositionAssignment.facultyId,
            studyProgramId:
              data.studyProgramId ?? currentPositionAssignment.studyProgramId,
            startDate:
              parseDateInput(data.startDate) ??
              currentPositionAssignment.startDate,
            endDate:
              data.endDate !== undefined
                ? parseDateInput(data.endDate)
                : currentPositionAssignment.endDate,
            isActive:
              data.isActivePosition ?? currentPositionAssignment.isActive,
          };

          if (!finalPayload.startDate) {
            throw new PositionAssignmentValidationError("Invalid start date");
          }

          await validatePositionAssignment(
            {
              positionId: finalPayload.positionId,
              facultyId: finalPayload.facultyId,
              studyProgramId: finalPayload.studyProgramId,
              startDate: finalPayload.startDate,
              endDate: finalPayload.endDate,
              isActive: finalPayload.isActive,
              excludeId: currentPositionAssignment.id,
            },
            log,
          );

          positionAssignment = await tx.positionAssignment.update({
            where: { id: currentPositionAssignment.id },
            data: positionAssignmentUpdateData,
            include: {
              position: {
                select: {
                  id: true,
                  name: true,
                  scopeType: true,
                  isSingleSeat: true,
                },
              },
              faculty: {
                select: {
                  id: true,
                  code: true,
                  name: true,
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
          });
        } else if (currentPositionAssignment) {
          positionAssignment = await tx.positionAssignment.findUnique({
            where: { id: currentPositionAssignment.id },
            include: {
              position: {
                select: {
                  id: true,
                  name: true,
                  scopeType: true,
                  isSingleSeat: true,
                },
              },
              faculty: {
                select: {
                  id: true,
                  code: true,
                  name: true,
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
          });
        }

        return { user: user!, lecturer: updatedLecturer, positionAssignment };
      });

      log.info(
        { lecturerId: id },
        "User, lecturer and position assignment updated successfully",
      );

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
    log.debug(
      { lecturerId: id },
      "Deleting user, lecturer and position assignment",
    );

    try {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!lecturer) {
        throw new UserPositionNotFoundError();
      }

      await prisma.$transaction(async (tx) => {
        await tx.positionAssignment.deleteMany({
          where: { userId: lecturer.userId },
        });

        await tx.lecturer.delete({
          where: { id },
        });

        await tx.user.delete({
          where: { id: lecturer.userId },
        });
      });

      log.info(
        { lecturerId: id },
        "User, lecturer and position assignment deleted successfully",
      );

      return { id };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },
};
