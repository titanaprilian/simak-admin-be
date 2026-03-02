import { createBaseApp, createProtectedApp } from "@/libs/base";
import { errorResponse, successResponse } from "@/libs/response";
import { AcademicTermService } from "./service";
import { AcademicTermModel } from "./model";
import {
  CreateAcademicTermSchema,
  UpdateAcademicTermSchema,
  GetAcademicTermsQuerySchema,
} from "./schema";
import { hasPermission } from "@/middleware/permission";
import { AcademicTermNotFoundError, InvalidDateRangeError } from "./error";

const FEATURE = "academic_term_management";

const protectedTerms = createProtectedApp()
  .get(
    "/",
    async ({ query, log, set, locale }) => {
      const { page = 1, limit = 10, isActive, search } = query;

      const { terms, pagination } = await AcademicTermService.getTerms(
        {
          page,
          limit,
          isActive,
          search,
        },
        log,
      );
      return successResponse(
        set,
        terms,
        { key: "academicTerm.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      query: GetAcademicTermsQuerySchema,
      beforeHandle: hasPermission(FEATURE, "read"),
      response: { 200: AcademicTermModel.terms, 500: AcademicTermModel.error },
    },
  )
  .get(
    "/options",
    async ({ query, log, set, locale }) => {
      const { page = 1, limit = 10, isActive, search } = query;

      const { options, pagination } = await AcademicTermService.getOptions(
        {
          page,
          limit,
          isActive,
          search,
        },
        log,
      );
      return successResponse(
        set,
        options,
        { key: "academicTerm.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      query: GetAcademicTermsQuerySchema, // Reusing pagination/search logic
      beforeHandle: hasPermission(FEATURE, "read"),
      response: {
        200: AcademicTermModel.getOptions,
        500: AcademicTermModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, log, set, locale }) => {
      const term = await AcademicTermService.getTermById(
        params.id,
        log,
        locale,
      );
      return successResponse(
        set,
        term,
        { key: "academicTerm.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE, "read"),
      response: { 200: AcademicTermModel.term, 404: AcademicTermModel.error },
    },
  )
  .post(
    "/",
    async ({ body, log, set, locale }) => {
      const term = await AcademicTermService.createTerm(body, log, locale);

      return successResponse(
        set,
        term,
        { key: "academicTerm.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      body: CreateAcademicTermSchema,
      beforeHandle: hasPermission(FEATURE, "create"),
      response: {
        201: AcademicTermModel.term,
        400: AcademicTermModel.validationError,
        500: AcademicTermModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, log, set, locale }) => {
      const term = await AcademicTermService.updateTerm(
        params.id,
        body,
        log,
        locale,
      );
      return successResponse(
        set,
        term,
        { key: "academicTerm.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      body: UpdateAcademicTermSchema,
      beforeHandle: hasPermission(FEATURE, "update"),
      response: { 200: AcademicTermModel.term, 404: AcademicTermModel.error },
    },
  )
  .delete(
    "/:id",
    async ({ params, log, set, locale }) => {
      await AcademicTermService.deleteTerm(params.id, log, locale);
      return successResponse(
        set,
        null,
        { key: "academicTerm.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE, "delete"),
      response: { 200: AcademicTermModel.term, 404: AcademicTermModel.error },
    },
  );

export const academicTerm = createBaseApp({ tags: ["Academic Term"] }).group(
  "/academic-terms",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof InvalidDateRangeError) {
          return errorResponse(set, 400, { key: error.key }, null, locale);
        }

        if (error instanceof AcademicTermNotFoundError) {
          return errorResponse(set, 404, { key: error.key }, null, locale);
        }
      })
      .use(protectedTerms),
);
