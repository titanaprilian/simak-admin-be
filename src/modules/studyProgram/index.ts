import { StudyProgramService } from "./service";
import { StudyProgramModel } from "./model";
import {
  CreateStudyProgramSchema,
  UpdateStudyProgramSchema,
  StudyProgramQuerySchema,
  StudyProgramParamsSchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission, type PermissionAction } from "@/middleware/permission";
import { prisma } from "@/libs/prisma";

const FEATURE_NAME = "studyProgram_management";

/**
 * Study Program Scoped Permission Helper
 *
 * This middleware enforces access control for study program management based on:
 * 1. RBAC permissions (studyProgram_management:create/read/update/delete)
 * 2. User role (SuperAdmin has full access)
 * 3. Position assignment scope (FACULTY or STUDY_PROGRAM scope)
 *
 * Scope Types:
 * - FACULTY scope: User can manage ALL study programs within that faculty
 * - STUDY_PROGRAM scope: User can only manage that specific study program (limited rights)
 *
 * Permission Rules:
 * - CREATE: RBAC create permission + FACULTY scope on target faculty
 * - READ: RBAC permission is enough
 * - UPDATE:
 *   - SuperAdmin OR FACULTY scope on current faculty
 *   - STUDY_PROGRAM scope holders: can only update if staying in same faculty
 *   - If moving to different faculty: needs FACULTY scope on BOTH current and target faculty
 * - DELETE: SuperAdmin OR user with FACULTY scope on parent faculty
 *
 * @param action - The permission action (create, read, update, delete)
 * @returns Middleware function that enforces scoped permissions
 */
const hasStudyProgramScopedPermission = (action: PermissionAction) => {
  const permissionGuard = hasPermission(FEATURE_NAME, action);

  return async (ctx: unknown) => {
    const context = ctx as {
      user: { id: string };
      params?: { id?: string };
      body?: { facultyId?: string };
      set: any;
      locale: string;
    };

    const permissionResult = await permissionGuard(context);
    if (permissionResult) {
      return permissionResult;
    }

    // For read, RBAC permission is enough
    if (action === "read") {
      return;
    }

    const { user, set, locale } = context;

    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (userWithRole?.role?.name === "SuperAdmin") {
      return;
    }

    const now = new Date();

    const hasFacultyScope = async (facultyId: string) => {
      const assignment = await prisma.positionAssignment.findFirst({
        where: {
          userId: user.id,
          facultyId,
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
          position: {
            scopeType: "FACULTY",
          },
        },
        select: { id: true },
      });

      return Boolean(assignment);
    };

    // CREATE: Must have FACULTY scope on target faculty
    if (action === "create") {
      const targetFacultyId = context.body?.facultyId;
      if (!targetFacultyId) {
        return errorResponse(
          set,
          403,
          { key: "common.forbidden" },
          null,
          locale,
        );
      }

      const allowed = await hasFacultyScope(targetFacultyId);
      if (!allowed) {
        return errorResponse(
          set,
          403,
          { key: "common.forbidden" },
          null,
          locale,
        );
      }

      return;
    }

    // DELETE: SuperAdmin OR faculty scope on parent faculty
    if (action === "delete") {
      const studyProgramId = context.params?.id;
      if (!studyProgramId) {
        return;
      }

      const currentProgram = await prisma.studyProgram.findUnique({
        where: { id: studyProgramId },
        select: { id: true, facultyId: true },
      });

      if (!currentProgram) {
        return;
      }

      const allowed = await hasFacultyScope(currentProgram.facultyId);
      if (!allowed) {
        return errorResponse(
          set,
          403,
          { key: "common.forbidden" },
          null,
          locale,
        );
      }

      return;
    }

    // UPDATE: SuperAdmin OR FACULTY scope OR STUDY_PROGRAM scope on same program
    const studyProgramId = context.params?.id;
    if (!studyProgramId) {
      return;
    }

    const currentProgram = await prisma.studyProgram.findUnique({
      where: { id: studyProgramId },
      select: { id: true, facultyId: true },
    });

    if (!currentProgram) {
      return;
    }

    // Check if user has STUDY_PROGRAM scope on this specific program
    const hasStudyProgramScope = async (spId: string) => {
      const assignment = await prisma.positionAssignment.findFirst({
        where: {
          userId: user.id,
          studyProgramId: spId,
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
          position: {
            scopeType: "STUDY_PROGRAM",
          },
        },
        select: { id: true },
      });
      return Boolean(assignment);
    };

    const hasProgramScopeOnCurrent = await hasStudyProgramScope(
      currentProgram.id,
    );

    // STUDY_PROGRAM scope holders can update but cannot move to different faculty
    if (hasProgramScopeOnCurrent) {
      const targetFacultyId = context.body?.facultyId;
      if (targetFacultyId && targetFacultyId !== currentProgram.facultyId) {
        return errorResponse(
          set,
          403,
          { key: "common.forbidden" },
          null,
          locale,
        );
      }
      return;
    }

    // Check FACULTY scope
    const allowedOnCurrentFaculty = await hasFacultyScope(
      currentProgram.facultyId,
    );
    if (!allowedOnCurrentFaculty) {
      return errorResponse(set, 403, { key: "common.forbidden" }, null, locale);
    }

    // If moving study program to another faculty, user must also own target faculty scope.
    const targetFacultyId = context.body?.facultyId;
    if (
      action === "update" &&
      targetFacultyId &&
      targetFacultyId !== currentProgram.facultyId
    ) {
      const allowedOnTargetFaculty = await hasFacultyScope(targetFacultyId);
      if (!allowedOnTargetFaculty) {
        return errorResponse(
          set,
          403,
          { key: "common.forbidden" },
          null,
          locale,
        );
      }
    }
  };
};

const protectedStudyProgram = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { studyPrograms, pagination } = await StudyProgramService.getAll(
        query,
        log,
      );
      return successResponse(
        set,
        studyPrograms,
        { key: "studyProgram.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasStudyProgramScopedPermission("read"),
      query: StudyProgramQuerySchema,
      response: {
        200: StudyProgramModel.list,
        400: StudyProgramModel.validationError,
        500: StudyProgramModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const program = await StudyProgramService.getById(params.id, log);
      return successResponse(
        set,
        program,
        { key: "studyProgram.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      params: StudyProgramParamsSchema,
      beforeHandle: hasStudyProgramScopedPermission("read"),
      response: {
        200: StudyProgramModel.get,
        400: StudyProgramModel.validationError,
        500: StudyProgramModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const program = await StudyProgramService.create(body, log);
      return successResponse(
        set,
        program,
        { key: "studyProgram.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasStudyProgramScopedPermission("create"),
      body: CreateStudyProgramSchema,
      response: {
        201: StudyProgramModel.create,
        400: StudyProgramModel.validationError,
        403: StudyProgramModel.error,
        500: StudyProgramModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const program = await StudyProgramService.update(params.id, body, log);
      return successResponse(
        set,
        program,
        { key: "studyProgram.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasStudyProgramScopedPermission("update"),
      params: StudyProgramParamsSchema,
      body: UpdateStudyProgramSchema,
      response: {
        200: StudyProgramModel.update,
        400: StudyProgramModel.validationError,
        403: StudyProgramModel.error,
        500: StudyProgramModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      await StudyProgramService.delete(params.id, log);
      return successResponse(
        set,
        null,
        { key: "studyProgram.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasStudyProgramScopedPermission("delete"),
      params: StudyProgramParamsSchema,
      response: {
        200: StudyProgramModel.delete,
        400: StudyProgramModel.validationError,
        403: StudyProgramModel.error,
        500: StudyProgramModel.error,
      },
    },
  );

export const studyProgram = createBaseApp({ tags: ["Study Program"] }).group(
  "/study-programs",
  (app) => app.use(protectedStudyProgram),
);
