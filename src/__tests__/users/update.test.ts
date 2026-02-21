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

describe("PATCH /users/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/users/some-id", {
        method: "PATCH",
        headers: {
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Name" }),
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
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no user_management update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
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
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has update permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if attempting to deactivate a SuperAdmin user", async () => {
    const superAdminRole = await prisma.role.create({
      data: { name: "SuperAdmin" },
    });

    const targetUser = await prisma.user.create({
      data: {
        name: "The Boss",
        email: "boss@admin.com",
        password: "hashed_password",
        roleId: superAdminRole.id,
        isActive: true,
      },
    });

    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(403);

    expect(body.message).toMatch(/forbidden|superadmin/i);
  });

  it("should update user name successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated Name");
  });

  it("should update email successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ email: "updated@example.com" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.email).toBe("updated@example.com");
  });

  it("should update password and hash it", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const targetUser = await prisma.user.findFirst();

    await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ password: "NewPassword123!" }),
      }),
    );

    const updated = await prisma.user.findUnique({
      where: { id: targetUser!.id },
    });

    expect(updated?.password).not.toBe("NewPassword123!");
  });

  it("should update roleId successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const newRole = await prisma.role.create({
      data: { name: "NewRole" },
    });

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ roleId: newRole.id }),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should update isActive flag", async () => {
    const { user, authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(false);
  });

  it("should return 404 if user does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 if request body is empty", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should not leak password in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const targetUser = await prisma.user.findFirst();

    const res = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    const body = await res.json();
    expect(body.data.password).toBeUndefined();
  });

  it("should return 403 if requester account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 401 if token version is outdated", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(401);
  });
});
