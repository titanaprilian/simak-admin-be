import { RbacService } from "./service";
import { RbacModel } from "./model";
import {
  CreateFeatureSchema,
  CreateRoleSchema,
  FeatureParamSchema,
  GetFeaturesQuerySchema,
  GetRolesOptionsQuerySchema,
  GetRolesQuerySchema,
  RoleParamSchema,
  UpdateFeatureSchema,
  UpdateRoleSchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";
import {
  DeleteSystemError,
  ForeignKeyError,
  InvalidFeatureIdError,
  RecordNotFoundError,
  UniqueConstraintError,
  UpdateSystemError,
} from "./error";

const FEATURE_NAME = "RBAC_management";

/**
 * PROTECTED ROUTES
 * These REQUIRE a valid Access Token.
 * 'user' is automatically injected by createProtectedApp().
 */
const protectedRbac = createProtectedApp()
  // -------------------------
  // FEATURES CRUD
  // -------------------------
  .get(
    "/features",
    async ({ set, query, log, locale }) => {
      const { page = 1, limit = 10, search } = query;

      const { features, pagination } = await RbacService.getAllFeatures(
        {
          page,
          limit,
          search,
        },
        log,
      );

      return successResponse(
        set,
        features,
        { key: "rbac.featureNotFound" },
        200,
        {
          pagination,
        },
        locale,
      );
    },
    {
      query: GetFeaturesQuerySchema,
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: RbacModel.getFeatures,
        500: RbacModel.error,
      },
    },
  )
  .post(
    "/features",
    async ({ body, set, log, locale }) => {
      const feature = await RbacService.createFeature(body, log);
      return successResponse(
        set,
        feature,
        { key: "rbac.createFeatureSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateFeatureSchema,
      response: {
        201: RbacModel.createFeature,
        400: RbacModel.validationError,
        500: RbacModel.error,
      },
    },
  )
  .patch(
    "/features/:id",
    async ({ params: { id }, body, set, log, locale }) => {
      const feature = await RbacService.updateFeature(id, body, log);
      return successResponse(
        set,
        feature,
        { key: "rbac.updateFeatureSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: FeatureParamSchema,
      body: UpdateFeatureSchema,
      response: {
        200: RbacModel.updateFeature,
        400: RbacModel.validationError,
        500: RbacModel.error,
      },
    },
  )
  .delete(
    "/features/:id",
    async ({ params: { id }, set, log, locale }) => {
      const deletedFeature = await RbacService.deleteFeature(id, log);
      return successResponse(
        set,
        deletedFeature,
        { key: "rbac.deleteFeatureSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: FeatureParamSchema,
      response: {
        200: RbacModel.deleteFeature,
        500: RbacModel.error,
      },
    },
  )

  // -------------------------
  // ROLES CRUD
  // -------------------------
  .get(
    "/roles",
    async ({ query, set, log, locale }) => {
      const { page = 1, limit = 10, search, feature } = query;

      const { roles, pagination } = await RbacService.getAllRoles(
        {
          page,
          limit,
          search,
          feature,
        },
        log,
      );

      return successResponse(
        set,
        roles,
        { key: "rbac.createRoleSuccess" },
        200,
        {
          pagination,
        },
        locale,
      );
    },
    {
      query: GetRolesQuerySchema,
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: RbacModel.getRoles,
        500: RbacModel.error,
      },
    },
  )
  .get(
    "/roles/options",
    async ({ query, set, log, locale }) => {
      const { page, limit, search } = query;
      const { roles, pagination } = await RbacService.getRoleOptions(
        {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
          search: search as string | undefined,
        },
        log,
      );
      return successResponse(
        set,
        roles,
        { key: "rbac.createRoleSuccess" },
        200,
        {
          pagination,
        },
        locale,
      );
    },
    {
      query: GetRolesOptionsQuerySchema,
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: RbacModel.getRoleOptions,
        500: RbacModel.error,
      },
    },
  )
  .get(
    "/roles/:id",
    async ({ params: { id }, set, log, locale }) => {
      const role = await RbacService.getRole(id, log);
      return successResponse(
        set,
        role,
        { key: "rbac.roleNotFound" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: RoleParamSchema,
      response: {
        200: RbacModel.getRole,
        404: RbacModel.error,
        500: RbacModel.error,
      },
    },
  )
  .get(
    "/roles/me",
    async ({ user, set, log, locale }) => {
      const myRole = await RbacService.getMyRole(user.id, log);
      return successResponse(
        set,
        myRole,
        { key: "rbac.roleNotFound" },
        200,
        undefined,
        locale,
      );
    },
    {
      response: {
        200: RbacModel.getMyRole,
        500: RbacModel.error,
      },
    },
  )
  .post(
    "/roles",
    async ({ body, set, log, locale }) => {
      const newRole = await RbacService.createRole(body, log);

      return successResponse(
        set,
        newRole,
        { key: "rbac.createRoleSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateRoleSchema,
      response: {
        201: RbacModel.createRole,
        400: RbacModel.validationError,
        500: RbacModel.error,
      },
    },
  )
  .patch(
    "/roles/:id",
    async ({ params: { id }, body, set, log, locale }) => {
      const updatedRole = await RbacService.updateRole(id, body, log);
      return successResponse(
        set,
        updatedRole,
        { key: "rbac.updateRoleSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: RoleParamSchema,
      body: UpdateRoleSchema,
      response: {
        200: RbacModel.updateRole,
        400: RbacModel.validationError,
        500: RbacModel.error,
      },
    },
  )
  .delete(
    "/roles/:id",
    async ({ params: { id }, set, log, locale }) => {
      const deletedRole = await RbacService.deleteRole(id, log);
      return successResponse(
        set,
        deletedRole,
        { key: "rbac.deleteRoleSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: RoleParamSchema,
      response: {
        200: RbacModel.deleteRole,
        500: RbacModel.error,
      },
    },
  );

/**
 * EXPORT
 * Combine them into a single plugin under the "/rbac" prefix.
 */
export const rbac = createBaseApp({ tags: ["RBAC"] }).group("/rbac", (app) =>
  app
    .onError(({ error, set, locale }) => {
      if (error instanceof ForeignKeyError) {
        return errorResponse(
          set,
          400,
          { key: error.key, params: { fieldName: error.field } },
          null,
          locale,
        );
      }

      if (error instanceof UniqueConstraintError) {
        return errorResponse(
          set,
          409,
          { key: error.key, params: { field: error.field } },
          null,
          locale,
        );
      }

      if (error instanceof RecordNotFoundError) {
        return errorResponse(
          set,
          404,
          { key: "common.notFound" },
          null,
          locale,
        );
      }

      if (error instanceof DeleteSystemError) {
        return errorResponse(
          set,
          403,
          { key: "rbac.deleteSystemRole" },
          null,
          locale,
        );
      }

      if (error instanceof UpdateSystemError) {
        return errorResponse(
          set,
          403,
          { key: "rbac.updateSystemRole" },
          null,
          locale,
        );
      }

      if (error instanceof InvalidFeatureIdError) {
        return errorResponse(
          set,
          400,
          { key: "rbac.invalidFeatureId" },
          null,
          locale,
        );
      }
    })
    .use(protectedRbac),
);
