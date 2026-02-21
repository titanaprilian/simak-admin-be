import { DashboardService } from "./service";
import { DashboardModel } from "./model";
import { successResponse } from "@/libs/response";
import { createBaseApp, createProtectedApp } from "@/libs/base";

const protectedDashboard = createProtectedApp().get(
  "/",
  async ({ set, log, locale }) => {
    const dashboard = await DashboardService.getDashboard(log);
    return successResponse(
      set,
      dashboard,
      { key: "dashboard.dashboardSuccess" },
      200,
      undefined,
      locale,
    );
  },
  {
    response: {
      200: DashboardModel.dashboard,
      500: DashboardModel.error,
    },
  },
);

export const dashboard = createBaseApp({ tags: ["Dashboard"] }).group(
  "/dashboard",
  (app) => app.use(protectedDashboard),
);
