import { FacultyService } from "./service";
import { FacultyModel } from "./model";
import {
  CreateFacultySchema,
  UpdateFacultySchema,
  FacultyQuerySchema,
  FacultyParamsSchema,
} from "./schema";
import { successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";

const FEATURE_NAME = "faculty_management";

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
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: FacultyModel.list,
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
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
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
  (app) => app.use(protectedFaculty),
);
