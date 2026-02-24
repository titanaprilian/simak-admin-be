import { prisma } from "@/libs/prisma";
import type {
  CreateFacultyInput,
  UpdateFacultyInput,
  FacultyQuery,
} from "./schema";
import type { Logger } from "pino";
import { RecordNotFoundError, UniqueConstraintError } from "@/libs/exceptions";
import { FacultyHasRelatedRecordsError } from "./error";

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

export const FacultyService = {
  getAll: async (params: FacultyQuery, log: Logger) => {
    log.debug(
      { page: params.page, limit: params.limit, search: params.search },
      "Fetching faculties list",
    );

    const { page, limit, search } = params;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [faculties, total] = await prisma.$transaction([
      prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.faculty.count({ where }),
    ]);

    log.info(
      { count: faculties.length, total },
      "Faculties retrieved successfully",
    );

    const facultiesWithStringDates = faculties.map((faculty) => ({
      ...faculty,
      createdAt: faculty.createdAt.toISOString(),
      updatedAt: faculty.updatedAt.toISOString(),
    }));

    return {
      faculties: facultiesWithStringDates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getById: async (id: string, log: Logger) => {
    log.debug({ facultyId: id }, "Fetching faculty details");

    try {
      const faculty = await prisma.faculty.findUniqueOrThrow({
        where: { id },
        include: {
          programs: {
            select: {
              id: true,
              code: true,
              name: true,
            },
            orderBy: { name: "asc" },
          },
        },
      });

      log.info(
        {
          facultyId: id,
          code: faculty.code,
          programCount: faculty.programs.length,
        },
        "Faculty details retrieved successfully",
      );

      return {
        ...faculty,
        createdAt: faculty.createdAt.toISOString(),
        updatedAt: faculty.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  create: async (data: CreateFacultyInput, log: Logger) => {
    log.debug({ code: data.code, name: data.name }, "Creating new faculty");

    try {
      const faculty = await prisma.faculty.create({
        data,
      });

      log.info(
        { facultyId: faculty.id, code: faculty.code },
        "Faculty created successfully",
      );

      return {
        ...faculty,
        createdAt: faculty.createdAt.toISOString(),
        updatedAt: faculty.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  update: async (id: string, data: UpdateFacultyInput, log: Logger) => {
    log.debug({ facultyId: id }, "Updating faculty");

    try {
      const faculty = await prisma.faculty.update({
        where: { id },
        data,
      });

      log.info(
        { facultyId: id, code: faculty.code },
        "Faculty updated successfully",
      );

      return {
        ...faculty,
        createdAt: faculty.createdAt.toISOString(),
        updatedAt: faculty.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  delete: async (id: string, log: Logger) => {
    log.debug({ facultyId: id }, "Deleting faculty");

    try {
      const [assignmentCount, programCount] = await Promise.all([
        prisma.positionAssignment.count({ where: { facultyId: id } }),
        prisma.studyProgram.count({ where: { facultyId: id } }),
      ]);

      if (assignmentCount > 0 || programCount > 0) {
        log.warn(
          { facultyId: id, assignmentCount, programCount },
          "Cannot delete faculty with related records",
        );
        throw new FacultyHasRelatedRecordsError();
      }

      const faculty = await prisma.faculty.delete({
        where: { id },
      });

      log.info(
        { facultyId: id, code: faculty.code },
        "Faculty deleted successfully",
      );

      return {
        ...faculty,
        createdAt: faculty.createdAt.toISOString(),
        updatedAt: faculty.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },
};
