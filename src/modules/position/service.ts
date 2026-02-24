import { handlePrismaError } from "@/libs/exceptions";
import { prisma } from "@/libs/prisma";
import type {
  CreatePositionAssignmentInput,
  CreatePositionInput,
  GetAssignmentsQueryInput,
  GetPositionsQueryInput,
  UpdatePositionAssignmentInput,
  UpdatePositionInput,
} from "./schema";
import {
  InvalidPositionAssignmentError,
  SingleSeatOccupiedError,
} from "./error";
import type { Logger } from "pino";
import { Prisma, ScopeType } from "@generated/prisma";

const toPositionResponse = (position: {
  id: string;
  name: string;
  scopeType: ScopeType;
  isSingleSeat: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...position,
  createdAt: position.createdAt.toISOString(),
  updatedAt: position.updatedAt.toISOString(),
});

const toAssignmentResponse = (assignment: {
  id: string;
  userId: string;
  positionId: string;
  facultyId: string | null;
  studyProgramId: string | null;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    loginId: string;
    email: string | null;
  };
  position: {
    id: string;
    name: string;
    scopeType: ScopeType;
  };
  faculty: {
    id: string;
    code: string;
    name: string;
  } | null;
  studyProgram: {
    id: string;
    code: string;
    name: string;
    facultyId: string;
  } | null;
}) => ({
  ...assignment,
  startDate: assignment.startDate.toISOString(),
  endDate: assignment.endDate?.toISOString() || null,
  createdAt: assignment.createdAt.toISOString(),
  updatedAt: assignment.updatedAt.toISOString(),
});

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
    throw new InvalidPositionAssignmentError("position.invalidDateRange");
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
    throw new InvalidPositionAssignmentError("position.positionNotFound");
  }

  if (position.scopeType === "FACULTY") {
    if (!facultyId) {
      throw new InvalidPositionAssignmentError(
        "position.facultyRequiredForFacultyScope",
      );
    }

    if (studyProgramId && facultyId) {
      const studyProgram = await prisma.studyProgram.findUnique({
        where: { id: studyProgramId },
        select: { facultyId: true },
      });

      if (!studyProgram || studyProgram.facultyId !== facultyId) {
        throw new InvalidPositionAssignmentError(
          "position.studyProgramOutsideFaculty",
        );
      }
    }
  }

  if (position.scopeType === "STUDY_PROGRAM") {
    if (facultyId) {
      throw new InvalidPositionAssignmentError(
        "position.facultyForbiddenForStudyProgramScope",
      );
    }

    if (!studyProgramId) {
      throw new InvalidPositionAssignmentError(
        "position.studyProgramRequiredForStudyProgramScope",
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
      throw new SingleSeatOccupiedError();
    }
  }
}

export const PositionService = {
  async getPositions(params: GetPositionsQueryInput, log: Logger) {
    log.debug(params, "Fetching positions list");

    const { page = 1, limit = 10, search, scopeType } = params;
    const where: Prisma.PositionWhereInput = {};

    if (scopeType) {
      where.scopeType = scopeType;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const skip = (page - 1) * limit;

    const [positions, total] = await prisma.$transaction([
      prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.position.count({ where }),
    ]);

    log.info(
      { count: positions.length, total },
      "Positions retrieved successfully",
    );

    return {
      positions: positions.map(toPositionResponse),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createPosition(data: CreatePositionInput, log: Logger) {
    log.debug(
      { name: data.name, scopeType: data.scopeType },
      "Creating position",
    );

    try {
      const position = await prisma.position.create({ data });

      log.info(
        { positionId: position.id, name: position.name },
        "Position created successfully",
      );
      return toPositionResponse(position);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async updatePosition(id: string, data: UpdatePositionInput, log: Logger) {
    log.debug({ positionId: id }, "Updating position");

    try {
      const position = await prisma.position.update({
        where: { id },
        data,
      });

      log.info({ positionId: id }, "Position updated successfully");
      return toPositionResponse(position);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async deletePosition(id: string, log: Logger) {
    log.debug({ positionId: id }, "Deleting position");

    try {
      const position = await prisma.position.delete({
        where: { id },
      });

      log.info({ positionId: id }, "Position deleted successfully");
      return toPositionResponse(position);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async getAssignments(params: GetAssignmentsQueryInput, log: Logger) {
    log.debug(params, "Fetching position assignments");

    const {
      page = 1,
      limit = 10,
      userId,
      positionId,
      facultyId,
      studyProgramId,
      isActive,
    } = params;

    const where: Prisma.PositionAssignmentWhereInput = {
      userId,
      positionId,
      facultyId,
      studyProgramId,
      isActive,
    };

    const skip = (page - 1) * limit;

    const [assignments, total] = await prisma.$transaction([
      prisma.positionAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
              scopeType: true,
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
              facultyId: true,
            },
          },
        },
      }),
      prisma.positionAssignment.count({ where }),
    ]);

    log.info(
      { count: assignments.length, total },
      "Position assignments retrieved successfully",
    );

    return {
      assignments: assignments.map(toAssignmentResponse),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createAssignment(data: CreatePositionAssignmentInput, log: Logger) {
    log.debug(
      {
        userId: data.userId,
        positionId: data.positionId,
        facultyId: data.facultyId,
        studyProgramId: data.studyProgramId,
      },
      "Creating position assignment",
    );

    const startDate = parseDateInput(data.startDate);
    const endDate = parseDateInput(data.endDate);

    if (!startDate) {
      throw new InvalidPositionAssignmentError("position.invalidStartDate");
    }

    try {
      await validatePositionAssignment(
        {
          positionId: data.positionId,
          facultyId: data.facultyId || null,
          studyProgramId: data.studyProgramId || null,
          startDate,
          endDate,
          isActive: data.isActive ?? true,
        },
        log,
      );

      const assignment = await prisma.positionAssignment.create({
        data: {
          userId: data.userId,
          positionId: data.positionId,
          facultyId: data.facultyId || null,
          studyProgramId: data.studyProgramId || null,
          startDate,
          endDate,
          isActive: data.isActive ?? true,
        },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
              scopeType: true,
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
              facultyId: true,
            },
          },
        },
      });

      log.info(
        { assignmentId: assignment.id },
        "Position assignment created successfully",
      );
      return toAssignmentResponse(assignment);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async updateAssignment(
    id: string,
    data: UpdatePositionAssignmentInput,
    log: Logger,
  ) {
    log.debug({ assignmentId: id }, "Updating position assignment");

    try {
      const existing = await prisma.positionAssignment.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          userId: true,
          positionId: true,
          facultyId: true,
          studyProgramId: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
      });

      const startDate =
        data.startDate !== undefined
          ? parseDateInput(data.startDate)
          : existing.startDate;
      const endDate =
        data.endDate !== undefined
          ? parseDateInput(data.endDate)
          : existing.endDate;

      if (!startDate) {
        throw new InvalidPositionAssignmentError("position.invalidStartDate");
      }

      const finalPayload = {
        positionId: data.positionId ?? existing.positionId,
        facultyId:
          data.facultyId !== undefined ? data.facultyId : existing.facultyId,
        studyProgramId:
          data.studyProgramId !== undefined
            ? data.studyProgramId
            : existing.studyProgramId,
        startDate,
        endDate,
        isActive: data.isActive ?? existing.isActive,
      };

      await validatePositionAssignment(
        {
          positionId: finalPayload.positionId,
          facultyId: finalPayload.facultyId || null,
          studyProgramId: finalPayload.studyProgramId || null,
          startDate: finalPayload.startDate,
          endDate: finalPayload.endDate,
          isActive: finalPayload.isActive,
          excludeId: id,
        },
        log,
      );

      const assignment = await prisma.positionAssignment.update({
        where: { id },
        data: {
          userId: data.userId,
          positionId: finalPayload.positionId,
          facultyId: finalPayload.facultyId || null,
          studyProgramId: finalPayload.studyProgramId || null,
          startDate: finalPayload.startDate,
          endDate: finalPayload.endDate,
          isActive: finalPayload.isActive,
        },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
              scopeType: true,
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
              facultyId: true,
            },
          },
        },
      });

      log.info(
        { assignmentId: id },
        "Position assignment updated successfully",
      );
      return toAssignmentResponse(assignment);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  async deleteAssignment(id: string, log: Logger) {
    log.debug({ assignmentId: id }, "Deleting position assignment");

    try {
      const assignment = await prisma.positionAssignment.delete({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
              scopeType: true,
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
              facultyId: true,
            },
          },
        },
      });

      log.info(
        { assignmentId: id },
        "Position assignment deleted successfully",
      );
      return toAssignmentResponse(assignment);
    } catch (error) {
      handlePrismaError(error, log);
    }
  },
};
