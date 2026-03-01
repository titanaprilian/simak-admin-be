// TODO: IMPLEMENT TESTING ON OPTIONS ENDPOINT

import { LecturerService } from "./service";
import { LecturerModel } from "./model";
import {
  CreateUserLecturerSchema,
  UpdateUserLecturerSchema,
  LecturerQuerySchema,
  LecturerParamsSchema,
  LecturerOptionsQuerySchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";
import { RecordNotFoundError } from "@/libs/exceptions";

const FEATURE_NAME = "lecturer_management";

const protectedLecturer = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { lecturers, pagination } = await LecturerService.getAll(
        query,
        log,
      );
      return successResponse(
        set,
        lecturers,
        { key: "lecturer.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: LecturerQuerySchema,
      response: {
        200: LecturerModel.list,
        400: LecturerModel.validationError,
        500: LecturerModel.error,
      },
    },
  )
  .get(
    "/options",
    async ({ query, set, log, locale }) => {
      const { page, limit, search } = query;
      const { lecturers, pagination } = await LecturerService.getOptions(
        {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
          search: search as string | undefined,
        },
        log,
      );
      return successResponse(
        set,
        lecturers,
        { key: "lecturer.optionsSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: LecturerOptionsQuerySchema,
      response: {
        200: LecturerModel.getOptions,
        400: LecturerModel.validationError,
        500: LecturerModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const lecturer = await LecturerService.getById(params.id, log);
      return successResponse(
        set,
        lecturer,
        { key: "lecturer.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: LecturerParamsSchema,
      response: {
        200: LecturerModel.get,
        400: LecturerModel.validationError,
        500: LecturerModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const result = await LecturerService.createWithUser(body, log);
      return successResponse(
        set,
        result,
        { key: "lecturer.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateUserLecturerSchema,
      response: {
        201: LecturerModel.create,
        400: LecturerModel.validationError,
        403: LecturerModel.error,
        500: LecturerModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const result = await LecturerService.updateWithUser(params.id, body, log);
      return successResponse(
        set,
        result,
        { key: "lecturer.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: LecturerParamsSchema,
      body: UpdateUserLecturerSchema,
      response: {
        200: LecturerModel.update,
        400: LecturerModel.validationError,
        403: LecturerModel.error,
        500: LecturerModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      await LecturerService.delete(params.id, log);
      return successResponse(
        set,
        null,
        { key: "lecturer.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: LecturerParamsSchema,
      response: {
        200: LecturerModel.delete,
        400: LecturerModel.validationError,
        403: LecturerModel.error,
        500: LecturerModel.error,
      },
    },
  );

export const userLecturers = createBaseApp({ tags: ["Lecturer"] }).group(
  "/user-lecturers",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof RecordNotFoundError) {
          return errorResponse(set, 404, { key: error.key }, null, locale);
        }
      })
      .use(protectedLecturer),
);
