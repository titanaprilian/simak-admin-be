import { createBaseApp } from "@/libs/base";
import { HealthService } from "./service";
import { HealthModel } from "./model";
import { successResponse } from "@/libs/response";

export const health = createBaseApp({
  tags: ["Health"],
}).get(
  "/health",
  async ({ set, locale }) => {
    const healthCheck = await HealthService.check();
    return successResponse(
      set,
      healthCheck,
      { key: "health.serverUp" },
      200,
      undefined,
      locale,
    );
  },
  {
    response: {
      200: HealthModel.ok,
      503: HealthModel.shuttingDown,
    },
  },
);
