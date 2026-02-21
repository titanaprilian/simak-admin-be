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

describe("DELETE /users/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/users/some-id", {
        method: "DELETE",
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
        method: "DELETE",
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
        method: "DELETE",
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no user_management delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has user_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has delete permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user tries to delete themselves", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete user successfully with valid permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const targetUser = await prisma.user.create({
      data: {
        name: "Delete Me",
        email: "delete@example.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const deleted = await prisma.user.findUnique({
      where: { id: targetUser.id },
    });

    expect(deleted).toBeNull();
  });

  it("should allow deleting inactive user", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const targetUser = await prisma.user.create({
      data: {
        name: "Inactive User",
        email: "inactive@example.com",
        password: "hashed",
        roleId: role.id,
        isActive: false,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should return 404 if user does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users/non-existent-id", {
        method: "DELETE",
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
      { featureName: "user_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users/invalid-id-format", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect([400, 404]).toContain(res.status);
  });

  it("should return 403 if requester account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "DELETE",
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
      { featureName: "user_management", action: "delete" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should handle concurrent delete requests safely", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const targetUser = await prisma.user.create({
      data: {
        name: "Concurrent Delete",
        email: "concurrent@example.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const [r1, r2] = await Promise.all([
      app.handle(
        new Request(`http://localhost/users/${targetUser.id}`, {
          method: "DELETE",
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request(`http://localhost/users/${targetUser.id}`, {
          method: "DELETE",
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
    ]);

    expect([200, 404]).toContain(r1.status);
    expect([200, 404]).toContain(r2.status);
  });
});
