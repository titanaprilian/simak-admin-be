import { logger } from "@/libs/logger";
import { errorResponse } from "@/libs/response";
import { rateLimit } from "elysia-rate-limit";

const getIp = (req: Request, server: any | null) => {
  if (server && typeof server.requestIP === "function") {
    const socketAddress = server.requestIP(req);
    if (socketAddress?.address) return socketAddress.address;
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "127.0.0.1";
};

export const globalRateLimit = rateLimit({
  duration: 60000,
  max: 60,
  // We cast 'as any' because the library types mistakenly say this can't be a function
  errorResponse: ((arg1: any, arg2: any) => {
    const context = arg2 || arg1;
    const request = (
      arg1 instanceof Request ? arg1 : context?.request
    ) as Request;

    const set = context?.set;

    const ip = getIp(request, null);

    logger.warn(
      { ip, url: request?.url, method: request?.method },
      "⚠️ Global Rate Limit Exceeded",
    );

    if (set) {
      set.headers = {
        ...(set.headers || {}),
        "Retry-After": "60",
      };

      return errorResponse(
        set,
        429,
        "Too many requests, please try again later.",
      );
    }

    return new Response(
      JSON.stringify({
        error: true,
        code: 429,
        message: "Too many requests, please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }) as any,

  generator: (req, server) => getIp(req, server),
});

export const authRateLimit = rateLimit({
  duration: 60000,
  max: 10,
  errorResponse: ((arg1: any, arg2: any) => {
    const context = arg2 || arg1;
    const request = (
      arg1 instanceof Request ? arg1 : context?.request
    ) as Request;

    const set = context?.set;

    logger.warn({ endpoint: request?.url }, "🚨 Auth Rate Limit Exceeded");

    if (set) {
      set.headers = {
        ...(set.headers || {}),
        "Retry-After": "60",
      };

      return errorResponse(
        set,
        429,
        "Too many requests, please try again later.",
      );
    }

    return new Response(
      JSON.stringify({
        error: true,
        code: 429,
        message: "Too many requests, please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }) as any,

  generator: (req, server) => {
    return getIp(req, server) + req.method;
  },
});
