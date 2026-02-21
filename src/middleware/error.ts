import { Elysia } from "elysia";
import { errorResponse } from "@/libs/response";
import { logger } from "@/libs/logger";

export const globalErrorHandler = new Elysia()
  .onError(({ code, set, error }) => {
    if (code === "NOT_FOUND") {
      return errorResponse(set, 404, "Page not found");
    }

    if (code === "PARSE") {
      return errorResponse(set, 400, "Parse Error: Invalid JSON body");
    }

    logger.error(
      {
        err: error,
        code: "INTERNAL_ERROR",
      },
      "Unhandled Server Error",
    );

    return errorResponse(set, 500, "Internal Server Error", {
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  })
  .as("scoped");
