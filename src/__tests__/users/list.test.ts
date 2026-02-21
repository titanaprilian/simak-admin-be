import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
  seedTestUsers,
} from "../test_utils";
import jwt from "jsonwebtoken";

describe("GET /users", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is invalid", async () => {
    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no user_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has only create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if read permission is on another feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return one data user with correct pagination when only requester exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?page=1&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it("should respect limit parameter", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    await prisma.user.createMany({
      data: Array.from({ length: 15 }).map((_, i) => ({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: "hashed",
        roleId: role.id,
      })),
    });

    const res = await app.handle(
      new Request("http://localhost/users?page=1&limit=5", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(5);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.total).toBeGreaterThanOrEqual(15);
  });

  it("should return different results for different pages", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const r1 = await app.handle(
      new Request("http://localhost/users?page=1&limit=3", {
        headers: authHeaders,
      }),
    );

    const r2 = await app.handle(
      new Request("http://localhost/users?page=2&limit=3", {
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

  it("should return correct user response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);

    body.data.forEach((user: any) => {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("roleId");
      expect(user).toHaveProperty("isActive");
    });

    expect(body.pagination).toHaveProperty("total");
    expect(body.pagination).toHaveProperty("page");
    expect(body.pagination).toHaveProperty("limit");
    expect(body.pagination).toHaveProperty("totalPages");
  });

  it("should not leak sensitive fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    body.data.forEach((user: any) => {
      expect(user.password).toBeUndefined();
      expect(user.tokenVersion).toBeUndefined();
      expect(user.refreshTokens).toBeUndefined();
    });
  });

  it("should include inactive users", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    await prisma.user.create({
      data: {
        name: "Inactive User",
        email: "inactive@example.com",
        password: "hashed",
        roleId: role.id,
        isActive: false,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    const inactive = body.data.find(
      (u: any) => u.email === "inactive@example.com",
    );

    expect(res.status).toBe(200);
    expect(inactive).toBeDefined();
    expect(inactive.isActive).toBe(false);
  });

  it("should return 403 after read permission is revoked", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const before = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    expect(before.status).toBe(200);

    const role = await prisma.role.findFirst({ where: { name: "TestUser" } });

    await prisma.roleFeature.deleteMany({
      where: {
        roleId: role!.id,
        feature: { name: "user_management" },
        canRead: true,
      },
    });

    const after = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    expect(after.status).toBe(403);
  });

  it("should return 401 if token version is outdated", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return consistent results for concurrent requests", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const [r1, r2, r3] = await Promise.all([
      app.handle(
        new Request("http://localhost/users", { headers: authHeaders }),
      ),
      app.handle(
        new Request("http://localhost/users", { headers: authHeaders }),
      ),
      app.handle(
        new Request("http://localhost/users", { headers: authHeaders }),
      ),
    ]);

    const [b1, b2, b3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(b1.data).toEqual(b2.data);
    expect(b2.data).toEqual(b3.data);
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?page=0&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.issues[0].message).toBe("Page number must be at least 1");
  });

  it("should return 400 if page is negative", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?page=-1&limit=10", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if limit exceeds maximum", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?limit=999", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.issues[0].message).toBe("Limit must be between 1 and 100");
  });

  it("should return 400 if limit is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?page=1&limit=0", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if page is not a number", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?page=abc&limit=10", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if limit is not a number", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users?page=1&limit=foo", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should fallback to defaults if pagination params are missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  it("should filter users by name (partial match)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    await seedTestUsers();

    const res = await app.handle(
      new Request("http://localhost/users?search=alice", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toMatch(/alice/i);
  });

  it("should filter users by email", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    await seedTestUsers();

    const res = await app.handle(
      new Request("http://localhost/users?search=bob@example.com", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].email).toBe("bob@example.com");
  });

  it("should filter users by isActive=true", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    await seedTestUsers();

    const res = await app.handle(
      new Request("http://localhost/users?isActive=true", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.every((u: any) => u.isActive === true)).toBe(true);
  });

  it("should filter users by isActive=false", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    await seedTestUsers();

    const res = await app.handle(
      new Request("http://localhost/users?isActive=false", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.every((u: any) => u.isActive === false)).toBe(true);
  });

  it.only("should filter users by roleId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    const { roleEmployee } = await seedTestUsers();

    const res = await app.handle(
      new Request(`http://localhost/users?roleId=${roleEmployee.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((u: any) => u.roleId === roleEmployee.id)).toBe(
      true,
    );
    expect(body.data.every((u: any) => u.roleName === roleEmployee.name)).toBe(
      true,
    );
  });

  it("should support combined filters (roleId + isActive)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    const { roleEmployee } = await seedTestUsers();

    const res = await app.handle(
      new Request(
        `http://localhost/users?roleId=${roleEmployee.id}&isActive=true`,
        { headers: authHeaders },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(
      body.data.every(
        (u: any) => u.roleId === roleEmployee.id && u.isActive === true,
      ),
    ).toBe(true);
  });

  it("should return empty result if no users match filters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    await seedTestUsers();

    const res = await app.handle(
      new Request("http://localhost/users?search=nonexistent", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should work together with pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);
    const { roleEmployee } = await seedTestUsers();

    const res = await app.handle(
      new Request(
        `http://localhost/users?roleId=${roleEmployee.id}&page=1&limit=1`,
        { headers: authHeaders },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.pagination.limit).toBe(1);
    expect(body.pagination.page).toBe(1);
  });
});
