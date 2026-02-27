import { createBaseApp, createProtectedApp } from "@/libs/base";
import { successResponse } from "@/libs/response";
import { hasPermission } from "@/middleware/permission";
import { ProgramPendidikanModel } from "./model";
import {
  CreateProgramPendidikanSchema,
  UpdateProgramPendidikanSchema,
  ProgramPendidikanQuerySchema,
  ProgramPendidikanParamsSchema,
  EducationalProgramOptionsQuerySchema,
} from "./schema";
import { ProgramPendidikanService } from "./service";

const FEATURE_NAME = "educational_program_management";

const protectedProgramPendidikan = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { programs, pagination } = await ProgramPendidikanService.getAll(
        query,
        log,
      );

      return successResponse(
        set,
        programs,
        { key: "educationalProgram.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: ProgramPendidikanQuerySchema,
      response: {
        200: ProgramPendidikanModel.list,
        400: ProgramPendidikanModel.validationError,
        500: ProgramPendidikanModel.error,
      },
    },
  )
  .get(
    "/options",
    async ({ query, set, log, locale }) => {
      const { programs, pagination } =
        await ProgramPendidikanService.getOptions(
          {
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10,
            search: query.search,
          },
          log,
        );
      return successResponse(
        set,
        programs,
        { key: "educationalProgram.optionsSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: EducationalProgramOptionsQuerySchema,
      response: {
        200: ProgramPendidikanModel.getOptions,
        400: ProgramPendidikanModel.validationError,
        500: ProgramPendidikanModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const program = await ProgramPendidikanService.getById(params.id, log);

      return successResponse(
        set,
        program,
        { key: "educationalProgram.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: ProgramPendidikanParamsSchema,
      response: {
        200: ProgramPendidikanModel.get,
        400: ProgramPendidikanModel.validationError,
        500: ProgramPendidikanModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const program = await ProgramPendidikanService.create(body, log);

      return successResponse(
        set,
        program,
        { key: "educationalProgram.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreateProgramPendidikanSchema,
      response: {
        201: ProgramPendidikanModel.create,
        400: ProgramPendidikanModel.validationError,
        500: ProgramPendidikanModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const program = await ProgramPendidikanService.update(
        params.id,
        body,
        log,
      );

      return successResponse(
        set,
        program,
        { key: "educationalProgram.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: ProgramPendidikanParamsSchema,
      body: UpdateProgramPendidikanSchema,
      response: {
        200: ProgramPendidikanModel.update,
        400: ProgramPendidikanModel.validationError,
        500: ProgramPendidikanModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      await ProgramPendidikanService.delete(params.id, log);

      return successResponse(
        set,
        null,
        { key: "educationalProgram.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: ProgramPendidikanParamsSchema,
      response: {
        200: ProgramPendidikanModel.delete,
        400: ProgramPendidikanModel.validationError,
        500: ProgramPendidikanModel.error,
      },
    },
  );

export const educationalProgram = createBaseApp({
  tags: ["Educational Programs"],
}).group("/educational-programs", (app) => app.use(protectedProgramPendidikan));
