import { prisma } from "@/libs/prisma";
import type {
  CreateAcademicClassInput,
  UpdateAcademicClassInput,
  BulkCreateAcademicClassInput,
} from "./schema";
import {
  AcademicClassNotFoundError,
  DuplicateAcademicClassError,
  StudyProgramNotFoundError,
  LecturerNotFoundError,
} from "./error";
import { Prisma } from "@generated/prisma";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";

export abstract class AcademicClassService {
  static async getAcademicClasses(
    params: {
      page: number;
      limit: number;
      search?: string;
      studyProgramId?: string;
      enrollmentYear?: number;
    },
    log: Logger,
  ) {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        studyProgramId: params.studyProgramId,
        enrollmentYear: params.enrollmentYear,
      },
      "Fetching AcademicClass list",
    );

    const { page, limit, search, studyProgramId, enrollmentYear } = params;

    const where: Prisma.AcademicClassWhereInput = {};

    if (studyProgramId) {
      where.studyProgramId = studyProgramId;
    }

    if (enrollmentYear) {
      where.enrollmentYear = enrollmentYear;
    }

    if (search) {
      where.name = { contains: search };
    }

    const skip = (page - 1) * limit;

    const [classes, total] = await prisma.$transaction([
      prisma.academicClass.findMany({
        where,
        include: {
          studyProgram: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          advisorLecturer: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      prisma.academicClass.count({ where }),
    ]);

    log.info(
      { count: classes.length, total },
      "AcademicClass retrieved successfully",
    );

    const classesWithStringDates = classes.map((cls) => ({
      ...cls,
      createdAt: cls.createdAt.toISOString(),
      updatedAt: cls.updatedAt.toISOString(),
    }));

    return {
      classes: classesWithStringDates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAcademicClassById(
    id: string,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug({ academicClassId: id }, "Fetching AcademicClass by ID");

    const academicClass = await prisma.academicClass.findUnique({
      where: { id },
      include: {
        studyProgram: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        advisorLecturer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!academicClass) {
      log.warn({ academicClassId: id }, "AcademicClass not found");
      throw new AcademicClassNotFoundError(locale);
    }

    return {
      ...academicClass,
      createdAt: academicClass.createdAt.toISOString(),
      updatedAt: academicClass.updatedAt.toISOString(),
    };
  }

  static async createAcademicClass(
    data: CreateAcademicClassInput,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug(
      {
        name: data.name,
        studyProgramId: data.studyProgramId,
        enrollmentYear: data.enrollmentYear,
      },
      "Creating AcademicClass",
    );

    const studyProgram = await prisma.studyProgram.findUnique({
      where: { id: data.studyProgramId },
    });

    if (!studyProgram) {
      log.warn(
        { studyProgramId: data.studyProgramId },
        "StudyProgram not found",
      );
      throw new StudyProgramNotFoundError(locale);
    }

    if (data.advisorLecturerId) {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id: data.advisorLecturerId },
      });

      if (!lecturer) {
        log.warn({ lecturerId: data.advisorLecturerId }, "Lecturer not found");
        throw new LecturerNotFoundError(locale);
      }
    }

    try {
      const academicClass = await prisma.academicClass.create({
        data: {
          name: data.name,
          studyProgramId: data.studyProgramId,
          enrollmentYear: data.enrollmentYear,
          capacity: data.capacity ?? 30,
          advisorLecturerId: data.advisorLecturerId,
        },
      });

      log.info(
        { academicClassId: academicClass.id },
        "AcademicClass created successfully",
      );
      return {
        ...academicClass,
        createdAt: academicClass.createdAt.toISOString(),
        updatedAt: academicClass.updatedAt.toISOString(),
      };
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2002") {
        log.warn(
          {
            studyProgramId: data.studyProgramId,
            enrollmentYear: data.enrollmentYear,
            name: data.name,
          },
          "Duplicate AcademicClass",
        );
        throw new DuplicateAcademicClassError(locale);
      }

      handlePrismaError(error, log);
    }
  }

  static async updateAcademicClass(
    id: string,
    data: UpdateAcademicClassInput,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug({ academicClassId: id }, "Updating AcademicClass");

    const existing = await prisma.academicClass.findUnique({
      where: { id },
    });

    if (!existing) {
      log.warn({ academicClassId: id }, "AcademicClass not found");
      throw new AcademicClassNotFoundError(locale);
    }

    if (data.studyProgramId) {
      const studyProgram = await prisma.studyProgram.findUnique({
        where: { id: data.studyProgramId },
      });

      if (!studyProgram) {
        log.warn(
          { studyProgramId: data.studyProgramId },
          "StudyProgram not found",
        );
        throw new StudyProgramNotFoundError(locale);
      }
    }

    if (data.advisorLecturerId !== undefined) {
      if (data.advisorLecturerId !== null) {
        const lecturer = await prisma.lecturer.findUnique({
          where: { id: data.advisorLecturerId },
        });

        if (!lecturer) {
          log.warn(
            { lecturerId: data.advisorLecturerId },
            "Lecturer not found",
          );
          throw new LecturerNotFoundError(locale);
        }
      }
    }

    try {
      const academicClass = await prisma.academicClass.update({
        where: { id },
        data: {
          name: data.name,
          studyProgramId: data.studyProgramId,
          enrollmentYear: data.enrollmentYear,
          capacity: data.capacity,
          advisorLecturerId: data.advisorLecturerId,
        },
      });

      log.info({ academicClassId: id }, "AcademicClass updated successfully");
      return {
        ...academicClass,
        createdAt: academicClass.createdAt.toISOString(),
        updatedAt: academicClass.updatedAt.toISOString(),
      };
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2002") {
        log.warn(
          {
            studyProgramId: data.studyProgramId,
            enrollmentYear: data.enrollmentYear,
            name: data.name,
          },
          "Duplicate AcademicClass",
        );
        throw new DuplicateAcademicClassError(locale);
      }
      throw error;
    }
  }

  static async deleteAcademicClass(
    id: string,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug({ academicClassId: id }, "Deleting AcademicClass");

    const existing = await prisma.academicClass.findUnique({
      where: { id },
    });

    if (!existing) {
      log.warn({ academicClassId: id }, "AcademicClass not found");
      throw new AcademicClassNotFoundError(locale);
    }

    await prisma.academicClass.delete({
      where: { id },
    });

    log.info({ academicClassId: id }, "AcademicClass deleted successfully");
  }

  static async bulkCreate(
    data: BulkCreateAcademicClassInput,
    log: Logger,
    locale: string = "en",
  ) {
    const { studyProgramId, enrollmentYear, capacity, totalClasses } = data;

    if (totalClasses < 1 || totalClasses > 26) {
      log.warn(
        { totalClasses },
        "Invalid totalClasses: must be between 1 and 26",
      );
      throw new Error("totalClasses must be between 1 and 26");
    }

    log.debug(
      { studyProgramId, enrollmentYear, totalClasses },
      "Bulk creating AcademicClass",
    );

    const studyProgram = await prisma.studyProgram.findUnique({
      where: { id: studyProgramId },
      include: { faculty: true },
    });

    if (!studyProgram) {
      log.warn({ studyProgramId }, "StudyProgram not found");
      throw new StudyProgramNotFoundError(locale);
    }

    const letters = Array.from({ length: totalClasses }, (_, i) =>
      String.fromCharCode(65 + i),
    );

    const classNames = letters.map(
      (letter) =>
        `${studyProgram.faculty.code}${studyProgram.code}-${enrollmentYear}-${letter}`,
    );

    const existingClasses = await prisma.academicClass.findMany({
      where: {
        studyProgramId,
        enrollmentYear,
        name: { in: classNames },
      },
    });

    if (existingClasses.length > 0) {
      log.warn(
        {
          studyProgramId,
          enrollmentYear,
          existingCount: existingClasses.length,
        },
        "Duplicate AcademicClass found",
      );
      throw new DuplicateAcademicClassError(locale);
    }

    const created = await prisma.$transaction(async (tx) => {
      const results = await tx.academicClass.createMany({
        data: classNames.map((name) => ({
          name,
          studyProgramId,
          enrollmentYear,
          capacity: capacity ?? 30,
        })),
      });
      return results;
    });

    log.info(
      { count: created.count },
      "Bulk AcademicClass created successfully",
    );

    return { count: created.count };
  }
}
