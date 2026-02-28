import { prisma } from "@/libs/prisma";
import type { Prisma } from "@generated/prisma";
import type {
  CreateStudyProgramInput,
  UpdateStudyProgramInput,
  StudyProgramQuery,
} from "./schema";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";
import { StudyProgramCodeExistsError, FacultyNotFoundError } from "./error";

function computeFullCode(facultyCode: string, rawCode: string): string {
  return facultyCode + rawCode;
}

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
          educationalProgram: {
            select: {
              id: true,
              name: true,
              level: true,
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

    const programsWithFullCode = programs.map((program) => ({
      ...program,
      code: computeFullCode(program.faculty.code, program.code),
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    }));

    return {
      studyPrograms: programsWithFullCode,
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
          educationalProgram: {
            select: {
              id: true,
              name: true,
              level: true,
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

      const fullCode = computeFullCode(program.faculty.code, program.code);

      log.info(
        {
          studyProgramId: id,
          code: fullCode,
          lecturerCount: program.lecturers.length,
        },
        "Study program details retrieved successfully",
      );

      return {
        ...program,
        code: fullCode,
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
      const faculty = await prisma.faculty.findUnique({
        where: { id: data.facultyId },
        select: { id: true, code: true },
      });

      if (!faculty) {
        throw new FacultyNotFoundError();
      }

      const existingProgram = await prisma.studyProgram.findFirst({
        where: {
          code: data.code,
          facultyId: data.facultyId,
        },
        select: { id: true },
      });

      log.debug(
        { code: data.code, facultyId: data.facultyId, existingProgram },
        "Checking for existing program",
      );

      if (existingProgram) {
        log.warn(
          { code: data.code, facultyId: data.facultyId },
          "Study program code already exists for this faculty",
        );
        throw new StudyProgramCodeExistsError();
      }

      const fullCode = computeFullCode(faculty.code, data.code);

      log.debug(
        { rawCode: data.code, facultyCode: faculty.code, fullCode },
        "Computed full code for study program",
      );

      const program = await prisma.studyProgram.create({
        data: {
          facultyId: data.facultyId,
          educationalProgramId: data.educationalProgramId,
          code: data.code,
          name: data.name,
          description: data.description,
        },
      });

      log.info(
        { studyProgramId: program.id, rawCode: program.code, fullCode },
        "Study program created successfully",
      );

      return {
        ...program,
        code: fullCode,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof StudyProgramCodeExistsError) {
        throw error;
      }
      handlePrismaError(error, log);
    }
  },

  update: async (id: string, data: UpdateStudyProgramInput, log: Logger) => {
    log.debug({ studyProgramId: id, data }, "Updating study program");

    try {
      const existingProgram = await prisma.studyProgram.findUnique({
        where: { id },
        select: { facultyId: true, code: true },
      });

      if (!existingProgram) {
        handlePrismaError(
          { code: "P2025", meta: { modelName: "StudyProgram" } },
          log,
        );
      }

      const targetFacultyId = data.facultyId ?? existingProgram!.facultyId;

      const faculty = await prisma.faculty.findUnique({
        where: { id: targetFacultyId },
        select: { id: true, code: true },
      });

      if (!faculty) {
        throw new FacultyNotFoundError();
      }

      const updateData: Prisma.StudyProgramUpdateInput = { ...data };

      if (data.code !== undefined) {
        const existingWithNewCode = await prisma.studyProgram.findFirst({
          where: {
            code: data.code,
            facultyId: targetFacultyId,
            NOT: { id },
          },
          select: { id: true },
        });

        if (existingWithNewCode) {
          log.warn(
            { code: data.code, facultyId: targetFacultyId },
            "Study program code already exists for this faculty",
          );
          throw new StudyProgramCodeExistsError();
        }

        log.debug(
          {
            oldCode: existingProgram!.code,
            newCode: data.code,
            facultyCode: faculty.code,
          },
          "Code changed, computing new full code",
        );
      }

      const program = await prisma.studyProgram.update({
        where: { id },
        data: updateData,
      });

      const fullCode = computeFullCode(faculty.code, program.code);

      log.info(
        { studyProgramId: id, rawCode: program.code, fullCode },
        "Study program updated successfully",
      );

      return {
        ...program,
        code: fullCode,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof StudyProgramCodeExistsError) {
        throw error;
      }
      if (error instanceof FacultyNotFoundError) {
        throw error;
      }
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
        select: { id: true, name: true, code: true, facultyId: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.studyProgram.count({ where }),
    ]);

    const facultyIds = [...new Set(programs.map((p) => p.facultyId))];
    const faculties = await prisma.faculty.findMany({
      where: { id: { in: facultyIds } },
      select: { id: true, code: true },
    });

    const facultyCodeMap = new Map(faculties.map((f) => [f.id, f.code]));

    const programsWithFullCode = programs.map((program) => ({
      id: program.id,
      name: program.name,
      code: computeFullCode(
        facultyCodeMap.get(program.facultyId)!,
        program.code,
      ),
    }));

    log.info(
      { count: programs.length, total },
      "Study program options retrieved successfully",
    );

    return {
      studyPrograms: programsWithFullCode,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
