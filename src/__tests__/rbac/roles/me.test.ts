import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../../test_utils";
import jwt from "jsonwebtoken";

describe("GET /rbac/roles/me", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
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
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if user no longer exists", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if token version is outdated", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return role name and permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
      { featureName: "RBAC_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roleName).toBe("TestUser");
    expect(body.data.permissions).toBeDefined();
    expect(Array.isArray(body.data.permissions)).toBe(true);
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty("roleName");
    expect(body.data).toHaveProperty("permissions");
  });

  it("should return permissions with correct fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
      { featureName: "RBAC_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    const userManagementPerm = body.data.permissions.find(
      (p: any) => p.featureName === "user_management",
    );

    expect(userManagementPerm).toBeDefined();
    expect(userManagementPerm.featureId).toBeDefined();
    expect(userManagementPerm.canRead).toBe(true);
    expect(userManagementPerm.canCreate).toBe(false);
    expect(userManagementPerm.canUpdate).toBe(false);
    expect(userManagementPerm.canDelete).toBe(false);
    expect(userManagementPerm.canPrint).toBe(false);
  });

  it("should return correct role name for user with specific role", async () => {
    const role = await prisma.role.create({
      data: { name: "CustomRole", description: "Custom role" },
    });

    const { authHeaders } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roleName).toBe("CustomRole");
  });

  it("should return empty permissions array if role has no permissions", async () => {
    const role = await prisma.role.create({
      data: { name: "NoPermRole", description: "Role with no permissions" },
    });

    const { authHeaders } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roleName).toBe("NoPermRole");
    expect(body.data.permissions).toEqual([]);
  });

  it("should handle concurrent requests consistently", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const [r1, r2, r3] = await Promise.all([
      app.handle(
        new Request("http://localhost/rbac/roles/me", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request("http://localhost/rbac/roles/me", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request("http://localhost/rbac/roles/me", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
    ]);

    const [b1, b2, b3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(b1.data.roleName).toBe(b2.data.roleName);
    expect(b2.data.roleName).toBe(b3.data.roleName);
  });
});
