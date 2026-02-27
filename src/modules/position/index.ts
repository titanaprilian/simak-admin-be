import { createBaseApp, createProtectedApp } from "@/libs/base";
import { errorResponse, successResponse } from "@/libs/response";
import { hasPermission } from "@/middleware/permission";
import { PositionModel } from "./model";
import {
  AssignmentParamsSchema,
  CreatePositionAssignmentSchema,
  CreatePositionSchema,
  GetAssignmentsQuerySchema,
  GetPositionsQuerySchema,
  PositionParamsSchema,
  UpdatePositionAssignmentSchema,
  UpdatePositionSchema,
} from "./schema";
import { PositionService } from "./service";
import {
  InvalidPositionAssignmentError,
  SingleSeatOccupiedError,
} from "./error";

const FEATURE_NAME = "position_management";

const protectedPosition = createProtectedApp()
  .get(
    "/",
    async ({ query, set, log, locale }) => {
      const { positions, pagination } = await PositionService.getPositions(
        query,
        log,
      );

      return successResponse(
        set,
        positions,
        { key: "position.listSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: GetPositionsQuerySchema,
      response: {
        200: PositionModel.listPositions,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, set, log, locale }) => {
      const position = await PositionService.getPosition(params.id, log);

      return successResponse(
        set,
        position,
        { key: "position.getSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      params: PositionParamsSchema,
      response: {
        200: PositionModel.getPosition,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .post(
    "/",
    async ({ body, set, log, locale }) => {
      const position = await PositionService.createPosition(body, log);

      return successResponse(
        set,
        position,
        { key: "position.createSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreatePositionSchema,
      response: {
        201: PositionModel.createPosition,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, log, locale }) => {
      const position = await PositionService.updatePosition(
        params.id,
        body,
        log,
      );

      return successResponse(
        set,
        position,
        { key: "position.updateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: PositionParamsSchema,
      body: UpdatePositionSchema,
      response: {
        200: PositionModel.updatePosition,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set, log, locale }) => {
      const position = await PositionService.deletePosition(params.id, log);

      return successResponse(
        set,
        position,
        { key: "position.deleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: PositionParamsSchema,
      response: {
        200: PositionModel.deletePosition,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .get(
    "/assignments",
    async ({ query, set, log, locale }) => {
      const { assignments, pagination } = await PositionService.getAssignments(
        query,
        log,
      );

      return successResponse(
        set,
        assignments,
        { key: "position.assignmentListSuccess" },
        200,
        { pagination },
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "read"),
      query: GetAssignmentsQuerySchema,
      response: {
        200: PositionModel.listAssignments,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .post(
    "/assignments",
    async ({ body, set, log, locale }) => {
      const assignment = await PositionService.createAssignment(body, log);

      return successResponse(
        set,
        assignment,
        { key: "position.assignmentCreateSuccess" },
        201,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "create"),
      body: CreatePositionAssignmentSchema,
      response: {
        201: PositionModel.createAssignment,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .patch(
    "/assignments/:id",
    async ({ params, body, set, log, locale }) => {
      const assignment = await PositionService.updateAssignment(
        params.id,
        body,
        log,
      );

      return successResponse(
        set,
        assignment,
        { key: "position.assignmentUpdateSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "update"),
      params: AssignmentParamsSchema,
      body: UpdatePositionAssignmentSchema,
      response: {
        200: PositionModel.updateAssignment,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  )
  .delete(
    "/assignments/:id",
    async ({ params, set, log, locale }) => {
      const assignment = await PositionService.deleteAssignment(params.id, log);

      return successResponse(
        set,
        assignment,
        { key: "position.assignmentDeleteSuccess" },
        200,
        undefined,
        locale,
      );
    },
    {
      beforeHandle: hasPermission(FEATURE_NAME, "delete"),
      params: AssignmentParamsSchema,
      response: {
        200: PositionModel.deleteAssignment,
        400: PositionModel.validationError,
        500: PositionModel.error,
      },
    },
  );

export const position = createBaseApp({ tags: ["Position"] }).group(
  "/positions",
  (app) =>
    app
      .onError(({ error, set, locale }) => {
        if (error instanceof InvalidPositionAssignmentError) {
          return errorResponse(set, 400, { key: error.key }, null, locale);
        }

        if (error instanceof SingleSeatOccupiedError) {
          return errorResponse(set, 409, { key: error.key }, null, locale);
        }
      })
      .use(protectedPosition),
);
