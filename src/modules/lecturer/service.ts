import { prisma } from "@/libs/prisma";
import type {
  CreateLecturerInput,
  UpdateLecturerInput,
  LecturerQuery,
} from "./schema";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";
import { LecturerNotFoundError, UserAlreadyHasLecturerError } from "./error";

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
              email: true,
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
        createdAt: lecturer.createdAt.toISOString(),
        updatedAt: lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  create: async (data: CreateLecturerInput, log: Logger) => {
    log.debug(
      { fullName: data.fullName, userId: data.userId },
      "Creating new lecturer",
    );

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { lecturer: true },
      });

      if (!existingUser) {
        throw new LecturerNotFoundError();
      }

      if (existingUser.lecturer) {
        throw new UserAlreadyHasLecturerError();
      }

      const lecturer = await prisma.lecturer.create({
        data,
      });

      log.info({ lecturerId: lecturer.id }, "Lecturer created successfully");

      return {
        ...lecturer,
        createdAt: lecturer.createdAt.toISOString(),
        updatedAt: lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  update: async (id: string, data: UpdateLecturerInput, log: Logger) => {
    log.debug({ lecturerId: id }, "Updating lecturer");

    try {
      const lecturer = await prisma.lecturer.update({
        where: { id },
        data,
      });

      log.info({ lecturerId: id }, "Lecturer updated successfully");

      return {
        ...lecturer,
        createdAt: lecturer.createdAt.toISOString(),
        updatedAt: lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  delete: async (id: string, log: Logger) => {
    log.debug({ lecturerId: id }, "Deleting lecturer");

    try {
      const lecturer = await prisma.lecturer.delete({
        where: { id },
      });

      log.info({ lecturerId: id }, "Lecturer deleted successfully");

      return {
        ...lecturer,
        createdAt: lecturer.createdAt.toISOString(),
        updatedAt: lecturer.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },
};
