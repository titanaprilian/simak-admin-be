import { AcademicClassService } from "./service";
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

const FEATURE_NAME = "academic_class";

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
    },
  );

export const academicClass = createBaseApp({ tags: ["AcademicClass"] }).group(
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
