import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";
import jwt from "jsonwebtoken";

describe("GET /users/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/users/some-id", {
        headers: {
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
      new Request(`http://localhost/users/${user.id}`, {
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
      new Request("http://localhost/users/some-id", {
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

    const targetUser = await prisma.user.create({
      data: {
        name: "Target User",
        email: "target@example.com",
        password: "hashed",
        roleId: (await prisma.role.create({ data: { name: "Employee" } })).id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has user_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const targetUser = await prisma.user.create({
      data: {
        name: "Target User",
        email: "target2@example.com",
        password: "hashed",
        roleId: (await prisma.role.create({ data: { name: "Employee" } })).id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has read permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const targetUser = await prisma.user.create({
      data: {
        name: "Target User",
        email: "target3@example.com",
        password: "hashed",
        roleId: (await prisma.role.create({ data: { name: "Employee" } })).id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 200 and user data if permission is valid", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const targetUser = await prisma.user.create({
      data: {
        name: "Target User",
        email: "target4@example.com",
        password: "hashed",
        roleId: role.id,
        isActive: true,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(targetUser.id);
    expect(body.data.email).toBe("target4@example.com");
  });

  it("should return correct user response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();

    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("name");
    expect(body.data).toHaveProperty("email");
    expect(body.data).toHaveProperty("roleId");
    expect(body.data).toHaveProperty("isActive");
  });

  it("should not leak sensitive fields", async () => {
    const { user, authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();

    expect(body.data.password).toBeUndefined();
    expect(body.data.tokenVersion).toBeUndefined();
    expect(body.data.refreshTokens).toBeUndefined();
  });

  it("should return 404 if user does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users/non-existent-id", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 if user ID format is invalid", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users/invalid-id-format", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect([400, 404]).toContain(res.status);
  });

  it("should return 403 if requesting user account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
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
      new Request(`http://localhost/users/${user.id}`, {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 after user_management read permission is revoked", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const before = await app.handle(
      new Request(
        `http://localhost/users/${(await prisma.user.findFirst())!.id}`,
        {
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        },
      ),
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
      new Request(
        `http://localhost/users/${(await prisma.user.findFirst())!.id}`,
        {
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        },
      ),
    );

    expect(after.status).toBe(403);
  });
});
