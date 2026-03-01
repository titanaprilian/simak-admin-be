import { AcademicClassService } from "./service";
import { AcademicClassModel } from "./model";
import {
  CreateAcademicClassSchema,
  GetAcademicClassesQuerySchema,
  UpdateAcademicClassSchema,
  AcademicClassParamSchema,
  BulkCreateAcademicClassSchema,
} from "./schema";
import { errorResponse, successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";
import {
  AcademicClassNotFoundError,
  DuplicateAcademicClassError,
  StudyProgramNotFoundError,
  LecturerNotFoundError,
} from "./error";

const FEATURE_NAME = "academic_class_management";

const protectedAcademicClass = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const {
        page = 1,
        limit = 10,
        search,
        studyProgramId,
        enrollmentYear,
      } = query;

      const { classes, pagination } =
        await AcademicClassService.getAcademicClasses(
          {
            page,
            limit,
            search,
            studyProgramId,
            enrollmentYear,
          },
          log,
        );

      return successResponse(
        set,
        classes,
        { key: "academicClass.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      query: GetAcademicClassesQuerySchema,
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: AcademicClassModel.academicClasses,
        500: AcademicClassModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const academicClass = await AcademicClassService.getAcademicClassById(
        params.id,
        log,
        locale,
      );
      return successResponse(
        set,
        academicClass,
        { key: "academicClass.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      params: AcademicClassParamSchema,
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      response: {
        200: AcademicClassModel.academicClass,
        404: AcademicClassModel.error,
        500: AcademicClassModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const academicClass = await AcademicClassService.createAcademicClass(
        body,
        log,
        locale,
      );
      return successResponse(
        set,
        academicClass,
        { key: "academicClass.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      body: CreateAcademicClassSchema,
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      response: {
        201: AcademicClassModel.createResult,
        400: AcademicClassModel.validationError,
        409: AcademicClassModel.error,
        500: AcademicClassModel.error,
      },
    },
  )
  .post(
    "/bulk",
    async ({ body, set, log, locale }) => {
      const result = await AcademicClassService.bulkCreate(body, log, locale);

      return successResponse(
        set,
        result,
        { key: "academicClass.bulkCreateSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      body: BulkCreateAcademicClassSchema,
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      response: {
        201: AcademicClassModel.bulkCreateResult,
        400: AcademicClassModel.validationError,
        409: AcademicClassModel.error,
        500: AcademicClassModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const academicClass = await AcademicClassService.updateAcademicClass(
        params.id,
        body,
        log,
        locale,
      );
      return successResponse(
        set,
        academicClass,
        { key: "academicClass.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      params: AcademicClassParamSchema,
      body: UpdateAcademicClassSchema,
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      response: {
        200: AcademicClassModel.updateResult,
        400: AcademicClassModel.validationError,
        404: AcademicClassModel.error,
        409: AcademicClassModel.error,
        500: AcademicClassModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      await AcademicClassService.deleteAcademicClass(params.id, log, locale);
      return successResponse(
        set,
        null,
        { key: "academicClass.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      params: AcademicClassParamSchema,
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      response: {
        200: AcademicClassModel.deleteResult,
        404: AcademicClassModel.error,
        500: AcademicClassModel.error,
      },
    },
  );

export const academicClass = createBaseApp({ tags: ["Academic Class"] }).group(
  "/academic-classes",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof AcademicClassNotFoundError) {
          return errorResponse(
            set,
            404,
            { key: "academicClass.notFound" },
            null,
            locale,
          );
        }

        if (error instanceof DuplicateAcademicClassError) {
          return errorResponse(
            set,
            409,
            { key: "academicClass.duplicate" },
            null,
            locale,
          );
        }

        if (error instanceof StudyProgramNotFoundError) {
          return errorResponse(
            set,
            400,
            { key: "academicClass.studyProgramNotFound" },
            null,
            locale,
          );
        }

        if (error instanceof LecturerNotFoundError) {
          return errorResponse(
            set,
            400,
            { key: "academicClass.lecturerNotFound" },
            null,
            locale,
          );
        }
      })
      .use(protectedAcademicClass),
);
