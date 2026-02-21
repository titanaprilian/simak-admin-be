import { prisma } from "@/libs/prisma";
import { healthState } from "./state";

export abstract class HealthService {
  static async check() {
    if (healthState.shuttingDown) {
      return {
        status: "shutting_down" as const,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    }

    let db: "up" | "down" = "up";

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }

    return {
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db,
    };
  }
}
