import { prisma } from "@/libs/prisma";
import type {
  CreateProgramPendidikanInput,
  UpdateProgramPendidikanInput,
  ProgramPendidikanQuery,
} from "./schema";
import type { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";

const toResponse = (program: {
  id: string;
  name: string;
  level: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...program,
  createdAt: program.createdAt.toISOString(),
  updatedAt: program.updatedAt.toISOString(),
});

export const ProgramPendidikanService = {
  async getAll(params: ProgramPendidikanQuery, log: Logger) {
    log.debug(
      { page: params.page, limit: params.limit, search: params.search },
      "Fetching ProgramPendidikan list",
    );

    const { page, limit, search } = params;
    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const skip = (page - 1) * limit;

    const [programs, total] = await prisma.$transaction([
      prisma.educationalProgram.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.educationalProgram.count({ where }),
    ]);

    log.info(
      { count: programs.length, total },
      "ProgramPendidikan retrieved successfully",
    );

    return {
      programs: programs.map(toResponse),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string, log: Logger) {
    log.debug({ programId: id }, "Fetching ProgramPendidikan details");

    try {
      const program = await prisma.educationalProgram.findUniqueOrThrow({
        where: { id },
      });

      log.info({ programId: id }, "ProgramPendidikan retrieved successfully");
      return toResponse(program);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async create(data: CreateProgramPendidikanInput, log: Logger) {
    log.debug(
      { name: data.name, level: data.level },
      "Creating ProgramPendidikan",
    );

    try {
      const program = await prisma.educationalProgram.create({
        data,
      });

      log.info(
        { programId: program.id },
        "ProgramPendidikan created successfully",
      );
      return toResponse(program);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async update(id: string, data: UpdateProgramPendidikanInput, log: Logger) {
    log.debug({ programId: id }, "Updating ProgramPendidikan");

    try {
      const program = await prisma.educationalProgram.update({
        where: { id },
        data,
      });

      log.info({ programId: id }, "ProgramPendidikan updated successfully");
      return toResponse(program);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async delete(id: string, log: Logger) {
    log.debug({ programId: id }, "Deleting ProgramPendidikan");

    try {
      const program = await prisma.educationalProgram.delete({
        where: { id },
      });

      log.info({ programId: id }, "ProgramPendidikan deleted successfully");
      return toResponse(program);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async getOptions(
    params: { page: number; limit: number; search?: string },
    log: Logger,
  ) {
    log.debug(
      { page: params.page, limit: params.limit, search: params.search },
      "Fetching educational program options",
    );

    const { page, limit, search } = params;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { level: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [programs, total] = await prisma.$transaction([
      prisma.educationalProgram.findMany({
        where,
        select: { id: true, name: true, level: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.educationalProgram.count({ where }),
    ]);

    log.info(
      { count: programs.length, total },
      "Educational program options retrieved successfully",
    );

    return {
      programs: programs.map((p) => ({
        id: p.id,
        name: p.name,
        level: p.level,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
