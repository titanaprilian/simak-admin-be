import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  createTestFeature,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /dashboard", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/dashboard", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is invalid", async () => {
    const res = await app.handle(
      new Request("http://localhost/dashboard", {
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return dashboard data for authenticated user", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/dashboard", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveProperty("totalUsers");
    expect(json.data).toHaveProperty("activeUsers");
    expect(json.data).toHaveProperty("inactiveUsers");
    expect(json.data).toHaveProperty("totalRoles");
    expect(json.data).toHaveProperty("totalFeatures");
    expect(json.data).toHaveProperty("userDistribution");
    expect(Array.isArray(json.data.userDistribution)).toBe(true);
  });

  it("should return correct counts when data exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestFeature("user_management");
    await createTestFeature("order_management");

    await createTestRoleWithPermissions("AdminRole", [
      { featureName: "user_management", action: "read" },
    ]);
    await createTestRoleWithPermissions("StaffRole", [
      { featureName: "order_management", action: "read" },
    ]);

    await prisma.user.createMany({
      data: [
        {
          email: "admin@test.com",
          password: "hashed",
          name: "Admin User",
          isActive: true,
          roleId: (
            await prisma.role.findUnique({ where: { name: "AdminRole" } })
          )?.id as string,
        },
        {
          email: "staff@test.com",
          password: "hashed",
          name: "Staff User",
          isActive: true,
          roleId: (
            await prisma.role.findUnique({ where: { name: "StaffRole" } })
          )?.id as string,
        },
        {
          email: "inactive@test.com",
          password: "hashed",
          name: "Inactive User",
          isActive: false,
          roleId: (
            await prisma.role.findUnique({ where: { name: "StaffRole" } })
          )?.id as string,
        },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/dashboard", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.totalUsers).toBeGreaterThanOrEqual(4);
    expect(json.data.activeUsers).toBe(3);
    expect(json.data.inactiveUsers).toBe(1);
    expect(json.data.totalRoles).toBeGreaterThanOrEqual(3);
    expect(json.data.totalFeatures).toBeGreaterThanOrEqual(2);
    expect(json.data.userDistribution.length).toBeGreaterThan(0);
  });
});
