import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
  seedTestFeatures,
} from "../../test_utils";
import jwt from "jsonwebtoken";

describe("GET /rbac/features", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return test user permission list initially", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data[0].name).toBe("RBAC_management");
  });

  it("should return 403 if user role has no RBAC_management permission at all", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user role only has RBAC_management create but not read", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user role only has RBAC_management update but not read", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user role only has RBAC_management delete but not read", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user role has permission on different feature, not RBAC_management", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 200 and feature list when role has RBAC_management read", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("should return all existing features in the system", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await createTestRoleWithPermissions("AdminUser", [
      { featureName: "user_management", action: "read" },
      { featureName: "order_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    const featureNames = body.data.map((f: any) => f.name);
    expect(featureNames).toContain("RBAC_management");
    expect(featureNames).toContain("user_management");
    expect(featureNames).toContain("order_management");
  });

  it("should return correct response structure for each feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    body.data.forEach((feature: any) => {
      expect(feature).toHaveProperty("id");
      expect(feature).toHaveProperty("name");
      expect(typeof feature.id).toBe("string");
      expect(typeof feature.name).toBe("string");
    });
  });

  it("should not leak sensitive internal data in feature response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    body.data.forEach((feature: any) => {
      expect(feature.roleId).toBeUndefined();
      expect(feature.userId).toBeUndefined();
      expect(feature.permissions).toBeUndefined();
    });
  });

  it("should allow access for AdminUser role with RBAC_management read", async () => {
    const adminRole = await createTestRoleWithPermissions("AdminUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const { authHeaders } = await createAuthenticatedUser({
      roleId: adminRole.id,
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should deny access for AdminUser role without RBAC_management read", async () => {
    const adminRole = await prisma.role.upsert({
      where: { name: "AdminUser" },
      update: {},
      create: { name: "AdminUser", description: "Admin role for tests" },
    });

    const { authHeaders } = await createAuthenticatedUser({
      roleId: adminRole.id,
    });
    await createTestRoleWithPermissions("AdminUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token has tampered signature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const token = authHeaders.Authorization.split(" ")[1];
    const parts = token.split(".");
    const tamperedToken = parts[0] + "." + parts[1] + ".tampered";

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 401 if user no longer exists", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if token version is outdated after logout all", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 after RBAC_management read permission is revoked", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const beforeRes = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(beforeRes.status).toBe(200);

    const role = await prisma.role.findFirst({ where: { name: "TestUser" } });
    await prisma.roleFeature.deleteMany({
      where: {
        roleId: role!.id,
        feature: { name: "RBAC_management" },
        canRead: true,
      },
    });

    const afterRes = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(afterRes.status).toBe(403);
  });

  it("should gain access after RBAC_management read permission is granted", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const beforeRes = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(beforeRes.status).toBe(403);

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const afterRes = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(afterRes.status).toBe(200);
  });

  it("should handle multiple concurrent requests consistently", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const [res1, res2, res3] = await Promise.all([
      app.handle(
        new Request("http://localhost/rbac/features", {
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        }),
      ),
      app.handle(
        new Request("http://localhost/rbac/features", {
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        }),
      ),
      app.handle(
        new Request("http://localhost/rbac/features", {
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        }),
      ),
    ]);

    const [body1, body2, body3] = await Promise.all([
      res1.json(),
      res2.json(),
      res3.json(),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
    expect(body1.data).toEqual(body2.data);
    expect(body2.data).toEqual(body3.data);
  });

  it("should return paginated feature list with default params", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);

    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 10,
    });

    expect(body.pagination.total).toBeGreaterThanOrEqual(5);
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("should respect limit parameter", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features?limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(2);
    expect(body.pagination.limit).toBe(2);
  });

  it("should return different results for different pages", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const r1 = await app.handle(
      new Request("http://localhost/rbac/features?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const r2 = await app.handle(
      new Request("http://localhost/rbac/features?page=2&limit=2", {
        headers: authHeaders,
      }),
    );

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b1.data).not.toEqual(b2.data);
    expect(b2.pagination.page).toBe(2);
  });

  it("should filter features by name (partial match)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features?search=order", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("order_management");
  });

  it("should return empty array if search does not match any feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features?search=nonexistent", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("should combine search and pagination correctly", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request(
        "http://localhost/rbac/features?search=management&limit=1&page=2",
        { headers: authHeaders },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(1);
    expect(body.pagination.total).toBeGreaterThanOrEqual(3);
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features?page=0", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if limit exceeds maximum", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features?limit=999", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should fallback to defaults if pagination params are missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestFeatures();

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });
});
