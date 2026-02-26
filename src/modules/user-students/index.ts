import { StudentService } from "./service";
import { StudentModel } from "./model";
import {
  StudentQuerySchema,
  CreateUserStudentSchema,
  UpdateUserStudentSchema,
  StudentParamSchema,
} from "./schema";
import { successResponse, errorResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";
import {
  LoginIdExistsError,
  EmailExistsError,
  StudentAlreadyExistsError,
  StudentNotFoundError,
  DeleteSelfStudentError,
} from "./error";

const FEATURE_NAME = "student_management";

const protectedStudent = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { students, pagination } = await StudentService.getAll(query, log);
      return successResponse(
        set,
        students,
        { key: "userStudents.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: StudentQuerySchema,
      response: {
        200: StudentModel.list,
        400: StudentModel.validationError,
        500: StudentModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const student = await StudentService.getUserStudentById(params.id, log);
      return successResponse(
        set,
        student,
        { key: "userStudents.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: StudentParamSchema,
      response: {
        200: StudentModel.get,
        400: StudentModel.validationError,
        500: StudentModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const result = await StudentService.createUserStudent(body, log);

      return successResponse(
        set,
        result,
        { key: "userStudents.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateUserStudentSchema,
      response: {
        201: StudentModel.create,
        400: StudentModel.validationError,
        401: StudentModel.error,
        403: StudentModel.error,
        409: StudentModel.error,
        500: StudentModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const result = await StudentService.updateUserStudent(
        params.id,
        body,
        log,
      );

      return successResponse(
        set,
        result,
        { key: "userStudents.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: StudentParamSchema,
      body: UpdateUserStudentSchema,
      response: {
        200: StudentModel.update,
        400: StudentModel.validationError,
        401: StudentModel.error,
        403: StudentModel.error,
        404: StudentModel.error,
        500: StudentModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, set, log, locale }) => {
      await StudentService.deleteUserStudent(params.id, user.id, log);

      return successResponse(
        set,
        null,
        { key: "userStudents.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: StudentParamSchema,
      response: {
        200: StudentModel.delete,
        401: StudentModel.error,
        403: StudentModel.error,
        404: StudentModel.error,
        500: StudentModel.error,
      },
    },
  );

export const userStudents = createBaseApp({ tags: ["User Students"] }).group(
  "/user-students",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof LoginIdExistsError) {
          return errorResponse(set, 409, { key: error.key }, null, locale);
        }
        if (error instanceof EmailExistsError) {
          return errorResponse(set, 409, { key: error.key }, null, locale);
        }
        if (error instanceof StudentAlreadyExistsError) {
          return errorResponse(set, 409, { key: error.key }, null, locale);
        }
        if (error instanceof StudentNotFoundError) {
          return errorResponse(set, 404, { key: error.key }, null, locale);
        }
        if (error instanceof DeleteSelfStudentError) {
          return errorResponse(set, 403, { key: error.key }, null, locale);
        }
      })
      .use(protectedStudent),
);
