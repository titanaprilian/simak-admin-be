import { prisma } from "@/libs/prisma";
import type { Prisma } from "@generated/prisma";
import type {
  CreateStudyProgramInput,
  UpdateStudyProgramInput,
  StudyProgramQuery,
} from "./schema";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";

export const StudyProgramService = {
  getAll: async (params: StudyProgramQuery, log: Logger) => {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        facultyId: params.facultyId,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
      "Fetching study programs list",
    );

    const { page, limit, search, facultyId, sortBy, sortOrder } = params;
    const where: Prisma.StudyProgramWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    const skip = (page - 1) * limit;
    const orderBy: Prisma.StudyProgramOrderByWithRelationInput =
      sortBy === "code"
        ? { code: sortOrder }
        : sortBy === "createdAt"
          ? { createdAt: sortOrder }
          : { name: sortOrder };

    const [programs, total] = await prisma.$transaction([
      prisma.studyProgram.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.studyProgram.count({ where }),
    ]);

    log.info(
      { count: programs.length, total },
      "Study programs retrieved successfully",
    );

    const programsWithStringDates = programs.map((program) => ({
      ...program,
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    }));

    return {
      studyPrograms: programsWithStringDates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getById: async (id: string, log: Logger) => {
    log.debug({ studyProgramId: id }, "Fetching study program details");

    try {
      const program = await prisma.studyProgram.findUniqueOrThrow({
        where: { id },
        include: {
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          lecturers: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      log.info(
        {
          studyProgramId: id,
          code: program.code,
          lecturerCount: program.lecturers.length,
        },
        "Study program details retrieved successfully",
      );

      return {
        ...program,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  create: async (data: CreateStudyProgramInput, log: Logger) => {
    log.debug(
      { code: data.code, name: data.name, facultyId: data.facultyId },
      "Creating new study program",
    );

    try {
      const program = await prisma.studyProgram.create({
        data,
      });

      log.info(
        { studyProgramId: program.id, code: program.code },
        "Study program created successfully",
      );

      return {
        ...program,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  update: async (id: string, data: UpdateStudyProgramInput, log: Logger) => {
    log.debug({ studyProgramId: id }, "Updating study program");

    try {
      const program = await prisma.studyProgram.update({
        where: { id },
        data,
      });

      log.info(
        { studyProgramId: id, code: program.code },
        "Study program updated successfully",
      );

      return {
        ...program,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  delete: async (id: string, log: Logger) => {
    log.debug({ studyProgramId: id }, "Deleting study program");

    try {
      const program = await prisma.studyProgram.delete({
        where: { id },
      });

      log.info(
        { studyProgramId: id, code: program.code },
        "Study program deleted successfully",
      );

      return {
        ...program,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  getOptions: async (
    params: {
      page: number;
      limit: number;
      search?: string;
      facultyId?: string;
    },
    log: Logger,
  ) => {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        facultyId: params.facultyId,
      },
      "Fetching study program options",
    );

    const { page, limit, search, facultyId } = params;
    const where: Prisma.StudyProgramWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    const skip = (page - 1) * limit;

    const [programs, total] = await prisma.$transaction([
      prisma.studyProgram.findMany({
        where,
        select: { id: true, name: true, code: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.studyProgram.count({ where }),
    ]);

    log.info(
      { count: programs.length, total },
      "Study program options retrieved successfully",
    );

    return {
      studyPrograms: programs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
