import { UserService } from "./service";
import { UserModel } from "./model";
import {
  CreateUserSchema,
  GetUsersQuerySchema,
  UpdateUserSchema,
  UserParamSchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";
import { Prisma } from "@generated/prisma";
import { DeleteSystemError } from "../rbac/error";
import { CreateSystemError, DeleteSelfError, UpdateSystemError } from "./error";

const FEATURE_NAME = "user_management";

const protectedUser = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { page = 1, limit = 10, isActive, roleId, search } = query;

      const { users, pagination } = await UserService.getUsers(
        {
          page,
          limit,
          isActive,
          roleId,
          search,
        },
        log,
      );

      return successResponse(
        set,
        users,
        { key: "user.listSuccess" },
        200,
        {
          pagination,
        },
        locale,
      );
    },
    {
      query: GetUsersQuerySchema,
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: UserModel.users,
        500: UserModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const data = await UserService.createUser(body, log, locale);
      return successResponse(
        set,
        data,
        { key: "user.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateUserSchema,
      response: {
        201: UserModel.createResult,
        400: UserModel.validationError,
        409: UserModel.error,
        500: UserModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const user = await UserService.getUser(params.id, log);
      if (!user) {
        return errorResponse(
          set,
          404,
          { key: "user.userNotFound" },
          null,
          locale,
        );
      }

      return successResponse(
        set,
        user,
        { key: "user.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: UserParamSchema,
      response: {
        200: UserModel.user,
        404: UserModel.error,
        500: UserModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ body, params, set, log, locale }) => {
      const updatedUser = await UserService.updateUser(
        params.id,
        body,
        log,
        locale,
      );

      return successResponse(
        set,
        updatedUser,
        { key: "user.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: UserParamSchema,
      body: UpdateUserSchema,
      response: {
        200: UserModel.createResult,
        400: UserModel.validationError,
        404: UserModel.error,
        500: UserModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, set, log, locale }) => {
      const deletedUser = await UserService.deleteUser(
        params.id,
        user.id,
        log,
        locale,
      );
      return successResponse(
        set,
        deletedUser,
        { key: "user.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: UserParamSchema,
      response: {
        200: UserModel.deleteResult,
        404: UserModel.error,
        500: UserModel.error,
      },
    },
  );

export const user = createBaseApp({ tags: ["User"] }).group("/users", (app) =>
  app
    .onError(({ error, set, locale }) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        const rawField = (error.meta?.field_name as string) || "unknown";
        const match = rawField.match(/_([a-zA-Z0-9]+)_fkey/);
        const fieldName = match ? match[1] : rawField;

        return errorResponse(
          set,
          400,
          { key: "common.badRequest", params: { field: fieldName } },
          null,
          locale,
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = (error.meta?.target as string[])?.join(", ") || "field";
        return errorResponse(
          set,
          409,
          { key: "common.error", params: { field: target } },
          null,
          locale,
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
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
          { key: "user.deleteSelf" },
          null,
          locale,
        );
      }

      if (error instanceof DeleteSelfError) {
        return errorResponse(
          set,
          403,
          { key: "user.deleteSelf" },
          null,
          locale,
        );
      }

      if (error instanceof CreateSystemError) {
        return errorResponse(
          set,
          403,
          { key: "user.createSystemAdmin" },
          null,
          locale,
        );
      }

      if (error instanceof UpdateSystemError) {
        return errorResponse(
          set,
          403,
          { key: "user.updateSystemAdmin" },
          null,
          locale,
        );
      }
    })
    .use(protectedUser),
);
