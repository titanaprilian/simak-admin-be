import { StudyProgramService } from "./service";
import { StudyProgramModel } from "./model";
import {
  CreateStudyProgramSchema,
  UpdateStudyProgramSchema,
  StudyProgramQuerySchema,
  StudyProgramParamsSchema,
} from "./schema";
import { successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { hasPermission } from "@/middleware/permission";

const FEATURE_NAME = "studyProgram_management";

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
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
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
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
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
