import { FacultyService } from "./service";
import { FacultyModel } from "./model";
import {
  CreateFacultySchema,
  UpdateFacultySchema,
  FacultyQuerySchema,
  FacultyParamsSchema,
  FacultyOptionsQuerySchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission, type PermissionAction } from "@/middleware/permission";
import { prisma } from "@/libs/prisma";
import { FacultyHasRelatedRecordsError } from "./error";

const FEATURE_NAME = "faculty_management";

/**
 * Faculty Scoped Permission Helper
 *
 * This middleware enforces access control for faculty management based on:
 * 1. RBAC permissions (faculty_management:create/read/update/delete)
 * 2. User role (SuperAdmin has full access)
 * 3. Position assignment scope (FACULTY scope grants access to that specific faculty)
 *
 * Permission Rules:
 * - CREATE: RBAC create permission (faculty_management:create)
 * - READ: RBAC permission OR SuperAdmin OR any faculty-scoped position holder
 * - UPDATE: SuperAdmin OR active FACULTY-scoped position in the target faculty
 * - DELETE: SuperAdmin only (position scope not allowed - faculty must have no related records)
 *
 * @param action - The permission action (create, read, update, delete)
 * @returns Middleware function that enforces scoped permissions
 */
const hasFacultyScopedPermission = (action: PermissionAction) => {
  const permissionGuard = hasPermission(FEATURE_NAME, action);

  return async (ctx: unknown) => {
    const context = ctx as {
      user: { id: string };
      params?: { id?: string };
      set: unknown;
      locale: string;
    };

    const permissionResult = await permissionGuard(context);
    if (permissionResult) {
      return permissionResult;
    }

    // CREATE: RBAC permission is enough (handled by permissionGuard above)
    // This block only executes if RBAC check passed

    // For read, allow access if RBAC passed
    if (action === "read") {
      return;
    }

    // DELETE: Only SuperAdmin can delete
    if (action === "delete") {
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

      if (userWithRole?.role?.name !== "SuperAdmin") {
        return errorResponse(
          set,
          403,
          {
            key: "faculty.forbiddenRole",
            params: { roleName: userWithRole?.role?.name || "Unknown" },
          },
          null,
          locale,
        );
      }
      return;
    }

    // UPDATE: SuperAdmin OR faculty-scoped position
    if (action !== "update") {
      return;
    }

    const facultyId = context.params?.id;
    if (!facultyId) {
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

    // Allow normal not-found behavior for missing faculty IDs.
    const facultyExists = await prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true },
    });
    if (!facultyExists) {
      return;
    }

    const now = new Date();

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

    if (!assignment) {
      return errorResponse(
        set,
        403,
        {
          key: "faculty.forbiddenRole",
          params: { roleName: userWithRole?.role?.name || "Unknown" },
        },
        null,
        locale,
      );
    }
  };
};

const protectedFaculty = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { faculties, pagination } = await FacultyService.getAll(query, log);
      return successResponse(
        set,
        faculties,
        { key: "faculty.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      query: FacultyQuerySchema,
      beforeHandle: hasFacultyScopedPermission("read"),
      response: {
        200: FacultyModel.list,
        400: FacultyModel.validationError,
        500: FacultyModel.error,
      },
    },
  )
  .get(
    "/options",
    async ({ query, set, log, locale }) => {
      const { page, limit, search } = query;
      const { faculties, pagination } = await FacultyService.getOptions(
        {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
          search: search as string | undefined,
        },
        log,
      );
      return successResponse(
        set,
        faculties,
        { key: "faculty.optionsSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasFacultyScopedPermission("read"),
      query: FacultyOptionsQuerySchema,
      response: {
        200: FacultyModel.getOptions,
        400: FacultyModel.validationError,
        500: FacultyModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const faculty = await FacultyService.getById(params.id, log);
      return successResponse(
        set,
        faculty,
        { key: "faculty.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasFacultyScopedPermission("read"),
      params: FacultyParamsSchema,
      response: {
        200: FacultyModel.get,
        400: FacultyModel.validationError,
        500: FacultyModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const faculty = await FacultyService.create(body, log);
      return successResponse(
        set,
        faculty,
        { key: "faculty.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasFacultyScopedPermission("create"),
      body: CreateFacultySchema,
      response: {
        201: FacultyModel.create,
        400: FacultyModel.validationError,
        403: FacultyModel.error,
        500: FacultyModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const faculty = await FacultyService.update(params.id, body, log);
      return successResponse(
        set,
        faculty,
        { key: "faculty.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasFacultyScopedPermission("update"),
      params: FacultyParamsSchema,
      body: UpdateFacultySchema,
      response: {
        200: FacultyModel.update,
        400: FacultyModel.validationError,
        403: FacultyModel.error,
        500: FacultyModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      await FacultyService.delete(params.id, log);
      return successResponse(
        set,
        null,
        { key: "faculty.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasFacultyScopedPermission("delete"),
      params: FacultyParamsSchema,
      response: {
        200: FacultyModel.delete,
        400: FacultyModel.validationError,
        403: FacultyModel.error,
        500: FacultyModel.error,
      },
    },
  );

export const faculty = createBaseApp({ tags: ["Faculty"] }).group(
  "/faculties",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof FacultyHasRelatedRecordsError) {
          return errorResponse(set, 400, { key: error.key }, null, locale);
        }
      })
      .use(protectedFaculty),
);
