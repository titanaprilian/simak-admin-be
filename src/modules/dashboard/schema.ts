import { z } from "zod";

export const DashboardResponseSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  inactiveUsers: z.number(),
  totalRoles: z.number(),
  totalFeatures: z.number(),
  userDistribution: z.array(
    z.object({
      roleName: z.string(),
      count: z.number(),
    }),
  ),
});

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
