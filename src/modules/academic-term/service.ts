import { prisma } from "@/libs/prisma";
import { Logger } from "pino";
import { handlePrismaError } from "@/libs/exceptions";
import { AcademicTermNotFoundError, InvalidDateRangeError } from "./error";
import type {
  CreateAcademicTermInput,
  UpdateAcademicTermInput,
} from "./schema";

export abstract class AcademicTermService {
  static async getTerms(
    params: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    },
    log: Logger,
  ) {
    log.debug(params, "Fetching AcademicTerm list");
    const { page, limit, search, isActive } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        academicYear: { contains: search, mode: "insensitive" as const },
      }),
      ...(typeof isActive === "boolean" && { isActive }),
    };

    const [terms, total] = await prisma.$transaction([
      prisma.academicTerm.findMany({
        where,
        skip,
        take: limit,
        orderBy: { termOrder: "desc" },
      }),
      prisma.academicTerm.count({ where }),
    ]);

    log.info(
      { count: terms.length, total },
      "AcademicTerm retrieved successfully",
    );

    // Convert Date objects to ISO strings
    const termWithStringDates = terms.map((term) => ({
      ...term,
      startDate: term.startDate.toISOString(),
      endDate: term.endDate.toISOString(),
      createdAt: term.createdAt.toISOString(),
      updatedAt: term.updatedAt.toISOString(),
    }));
    return {
      terms: termWithStringDates,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getTermById(id: string, log: Logger, locale: string = "en") {
    log.debug({ id }, "Fetching AcademicTerm by ID");

    try {
      const term = await prisma.academicTerm.findUnique({
        where: { id },
      });

      if (!term) {
        throw new AcademicTermNotFoundError();
      }

      log.info({ id }, "AcademicTerm retrieved successfully");
      return {
        ...term,
        startDate: term.startDate.toISOString(),
        endDate: term.endDate.toISOString(),
        createdAt: term.createdAt.toISOString(),
        updatedAt: term.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  }

  static async getOptions(
    params: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    },
    log: Logger,
  ) {
    log.debug(params, "Fetching AcademicTerm options");
    const { page, limit, search, isActive } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        academicYear: { contains: search, mode: "insensitive" as const },
      }),
      ...(typeof isActive === "boolean" && { isActive }),
    };

    const [terms, total] = await prisma.$transaction([
      prisma.academicTerm.findMany({
        where,
        select: { id: true, academicYear: true, termType: true },
        skip,
        take: limit,
        orderBy: [{ academicYear: "desc" }, { termOrder: "desc" }],
      }),
      prisma.academicTerm.count({ where }),
    ]);

    // Map to the option structure
    const options = terms.map((t) => ({
      id: t.id,
      label: `${t.academicYear} ${t.termType}`,
    }));

    log.info(
      { count: options.length, total },
      "AcademicTerm options retrieved successfully",
    );
    return {
      options,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async createTerm(
    data: CreateAcademicTermInput,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug(
      { academicYear: data.academicYear, termType: data.termType },
      "Creating AcademicTerm",
    );

    try {
      return await prisma.$transaction(async (tx) => {
        let termOrder = data.termOrder;

        if (!termOrder) {
          const lastTerm = await tx.academicTerm.findFirst({
            orderBy: { termOrder: "desc" },
            select: { termOrder: true },
          });

          termOrder = lastTerm ? lastTerm.termOrder + 1 : 1;
        }

        if (data.isActive) {
          await tx.academicTerm.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
        }
        const term = await tx.academicTerm.create({
          data: {
            ...data,
            termOrder,
          },
        });
        log.info({ id: term.id }, "AcademicTerm created successfully");

        return {
          ...term,
          startDate: term.startDate.toISOString(),
          endDate: term.endDate.toISOString(),
          createdAt: term.createdAt.toISOString(),
          updatedAt: term.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      handlePrismaError(error, log);
    }
  }

  static async updateTerm(
    id: string,
    data: UpdateAcademicTermInput,
    log: Logger,
    locale: string = "en",
  ) {
    log.debug({ id }, "Updating AcademicTerm");

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.academicTerm.findUnique({ where: { id } });
        if (!existing) throw new AcademicTermNotFoundError(locale);

        const finalStartDate = data.startDate ?? existing.startDate;
        const finalEndDate = data.endDate ?? existing.endDate;

        if (finalStartDate >= finalEndDate) {
          throw new InvalidDateRangeError(locale);
        }

        if (data.isActive === true) {
          await tx.academicTerm.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
        }

        const updated = await tx.academicTerm.update({ where: { id }, data });
        log.info({ id }, "AcademicTerm updated successfully");

        return {
          ...updated,
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      handlePrismaError(error, log);
    }
  }

  static async deleteTerm(id: string, log: Logger, locale: string = "en") {
    try {
      const term = await prisma.academicTerm.delete({ where: { id } });
      log.info({ id }, "AcademicTerm deleted successfully");

      return {
        ...term,
        createdAt: term.createdAt.toISOString(),
        updatedAt: term.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  }
}
