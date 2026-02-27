import { UserPositionService } from "./service";
import { UserPositionModel } from "./model";
import {
  CreateUserPositionSchema,
  UpdateUserPositionSchema,
  UserPositionQuerySchema,
  UserPositionParamsSchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";
import {
  UserPositionNotFoundError,
  PositionAssignmentValidationError,
  CreateSuperAdminError,
  UpdateSuperAdminError,
  DeactivateSuperAdminError,
} from "./error";

const FEATURE_NAME = "user_position_management";

const protectedUserPosition = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { userPositions, pagination } = await UserPositionService.getAll(
        query,
        log,
      );
      return successResponse(
        set,
        userPositions,
        { key: "userPositions.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: UserPositionQuerySchema,
      response: {
        200: UserPositionModel.list,
        400: UserPositionModel.validationError,
        500: UserPositionModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const userPosition = await UserPositionService.getById(params.id, log);
      return successResponse(
        set,
        userPosition,
        { key: "userPositions.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: UserPositionParamsSchema,
      response: {
        200: UserPositionModel.get,
        400: UserPositionModel.validationError,
        500: UserPositionModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const result = await UserPositionService.create(body, log);
      return successResponse(
        set,
        result,
        { key: "userPositions.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateUserPositionSchema,
      response: {
        201: UserPositionModel.create,
        400: UserPositionModel.validationError,
        500: UserPositionModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const result = await UserPositionService.update(params.id, body, log);
      return successResponse(
        set,
        result,
        { key: "userPositions.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: UserPositionParamsSchema,
      body: UpdateUserPositionSchema,
      response: {
        200: UserPositionModel.update,
        400: UserPositionModel.validationError,
        500: UserPositionModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      await UserPositionService.delete(params.id, log);
      return successResponse(
        set,
        null,
        { key: "userPositions.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: UserPositionParamsSchema,
      response: {
        200: UserPositionModel.delete,
        400: UserPositionModel.validationError,
        500: UserPositionModel.error,
      },
    },
  );

export const userPositions = createBaseApp({ tags: ["User Positions"] }).group(
  "/user-positions",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof UserPositionNotFoundError) {
          return errorResponse(set, 404, { key: error.key }, null, locale);
        }
        if (error instanceof PositionAssignmentValidationError) {
          return errorResponse(set, 400, { key: error.key }, null, locale);
        }
        if (error instanceof CreateSuperAdminError) {
          return errorResponse(set, 403, { key: error.key }, null, locale);
        }
        if (error instanceof UpdateSuperAdminError) {
          return errorResponse(set, 403, { key: error.key }, null, locale);
        }
        if (error instanceof DeactivateSuperAdminError) {
          return errorResponse(set, 403, { key: error.key }, null, locale);
        }
      })
      .use(protectedUserPosition),
);
