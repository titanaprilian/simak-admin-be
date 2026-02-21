import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
  seedTestRoles,
} from "../../test_utils";
import jwt from "jsonwebtoken";

describe("GET /rbac/roles", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user role has no RBAC_management permission at all", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
      new Request("http://localhost/rbac/roles", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user role has permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 200 and list of roles when RBAC_management read is granted", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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

  it("should return all roles in the system", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.role.create({
      data: { name: "AdminUser", description: "Admin role" },
    });

    await prisma.role.create({
      data: { name: "ManagerUser", description: "Manager role" },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    const roleNames = body.data.map((r: any) => r.name);

    expect(res.status).toBe(200);
    expect(roleNames).toContain("TestUser");
    expect(roleNames).toContain("AdminUser");
    expect(roleNames).toContain("ManagerUser");
  });

  it("should return correct response structure for each role", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);

    body.data.forEach((role: any) => {
      expect(role).toHaveProperty("id");
      expect(role).toHaveProperty("name");
      expect(role).toHaveProperty("description");
      expect(typeof role.id).toBe("string");
      expect(typeof role.name).toBe("string");
    });
  });

  it("should not leak sensitive internal data in role response", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();

    body.data.forEach((role: any) => {
      expect(role.users).toBeUndefined();
      expect(role.roleFeatures).toBeUndefined();
    });
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
      new Request("http://localhost/rbac/roles", {
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
      new Request("http://localhost/rbac/roles", {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should deny access after RBAC_management read permission is revoked", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const beforeRes = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
      new Request("http://localhost/rbac/roles", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(afterRes.status).toBe(403);
  });

  it("should handle concurrent role list requests consistently", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const [r1, r2] = await Promise.all([
      app.handle(
        new Request("http://localhost/rbac/roles", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request("http://localhost/rbac/roles", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
    ]);

    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b1.data).toEqual(b2.data);
  });

  it("should return paginated roles with default params", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles?limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(2);
    expect(body.pagination.limit).toBe(2);
  });

  it("should return different roles for different pages", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestRoles();

    const r1 = await app.handle(
      new Request("http://localhost/rbac/roles?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const r2 = await app.handle(
      new Request("http://localhost/rbac/roles?page=2&limit=2", {
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

  it("should filter roles by name (search)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles?search=Admin", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("AdminUser");
  });

  it("should return empty result when search does not match any role", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles?search=nonexistent", {
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
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles?search=User&limit=1&page=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(1);
    expect(body.pagination.total).toBeGreaterThanOrEqual(4);
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles?page=0", {
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
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles?limit=999", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should fallback to defaults when pagination params are missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);
    await seedTestRoles();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });
});

describe("GET /rbac/roles/options", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no RBAC_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has RBAC_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 200 and list of role options", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.role.createMany({
      data: [
        { name: "AdminUser", description: "Admin role" },
        { name: "ManagerUser", description: "Manager role" },
        { name: "EmployeeUser", description: "Employee role" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("should return only id and name fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.role.create({
      data: { name: "TestRole", description: "Test description" },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    body.data.forEach((role: any) => {
      expect(role).toHaveProperty("id");
      expect(role).toHaveProperty("name");
      expect(role.description).toBeUndefined();
      expect(role.permissions).toBeUndefined();
      expect(role.createdAt).toBeUndefined();
      expect(role.updatedAt).toBeUndefined();
    });
  });

  it("should return roles sorted by name", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.role.createMany({
      data: [
        { name: "Zebra Role" },
        { name: "Alpha Role" },
        { name: "Middle Role" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    const roleNames = body.data.map((r: any) => r.name);
    expect(roleNames).toEqual(roleNames.sort());
  });

  it("should support search parameter", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.role.createMany({
      data: [
        { name: "AdminUser" },
        { name: "ManagerUser" },
        { name: "EmployeeUser" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options?search=Admin", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("AdminUser");
  });

  it("should support pagination parameters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    await prisma.role.createMany({
      data: [
        { name: "Role1" },
        { name: "Role2" },
        { name: "Role3" },
        { name: "Role4" },
        { name: "Role5" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options?page=1&limit=2", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBeGreaterThanOrEqual(5);
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
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
      new Request("http://localhost/rbac/roles/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options?page=0", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if limit exceeds maximum", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/options?limit=999", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
  });
});
