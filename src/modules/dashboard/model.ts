import { z } from "zod";
import { createErrorSchema, createResponseSchema } from "@/libs/response";

const RoleDistributionItem = z.object({
  roleName: z.string(),
  count: z.number(),
});

const DashboardData = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  inactiveUsers: z.number(),
  totalRoles: z.number(),
  totalFeatures: z.number(),
  userDistribution: z.array(RoleDistributionItem),
});

export const DashboardModel = {
  dashboard: createResponseSchema(DashboardData),
  error: createErrorSchema(z.null()),
};

export type DashboardData = z.infer<typeof DashboardData>;
