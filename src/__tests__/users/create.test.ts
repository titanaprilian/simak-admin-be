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

describe("POST /users", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      roleId: "role-id",
    };

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no user_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const role = await prisma.role.create({
      data: { name: "Employee" },
    });

    const payload = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      roleId: role.id,
    };

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has user_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Employee" },
    });

    const payload = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      roleId: role.id,
    };

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has create permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Employee" },
    });

    const payload = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      roleId: role.id,
    };

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if attempting to create a second SuperAdmin user", async () => {
    const superAdminRole = await prisma.role.create({
      data: { name: "SuperAdmin" },
    });

    await prisma.user.create({
      data: {
        name: "The Super Admin",
        email: "super@admin.com",
        password: "hashed_password",
        roleId: superAdminRole.id,
      },
    });

    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          name: "Wannabe SuperAdmin",
          email: "wannabe@example.com",
          password: "Password123!",
          roleId: superAdminRole.id, // This should trigger the error
        }),
      }),
    );

    // 5. Assertions
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.message).toBe(
      "Operation Forbidden: You cannot create user with SuperAdmin role more than one",
    );
  });

  it("should create user successfully with valid permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Employee" },
    });

    const payload = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      roleId: role.id,
    };

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.email).toBe("john@example.com");
    expect(body.data.password).toBeUndefined();
  });

  it("should create user with isActive defaulted to true", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Employee" },
    });

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "Jane Doe",
          email: "jane@example.com",
          password: "Password123!",
          roleId: role.id,
        }),
      }),
    );

    const user = await prisma.user.findUnique({
      where: { email: "jane@example.com" },
    });

    expect(user?.isActive).toBe(true);
  });

  it("should return 201 even if name is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          email: "john@example.com",
          password: "Password123!",
          roleId: role.id,
        }),
      }),
    );

    expect(res.status).toBe(201);
  });

  it("should return 400 if email is invalid", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          name: "John",
          email: "not-an-email",
          password: "Password123!",
          roleId: role.id,
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if password is too short", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          name: "John",
          email: "john@example.com",
          password: "123",
          roleId: role.id,
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if roleId does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          name: "John",
          email: "john@example.com",
          password: "Password123!",
          roleId: "non-existent-id",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 if email already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    await prisma.user.create({
      data: {
        name: "Existing",
        email: "john@example.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          name: "John",
          email: "john@example.com",
          password: "Password123!",
          roleId: role.id,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should hash password before saving", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.create({ data: { name: "Employee" } });

    await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          name: "Secure User",
          email: "secure@example.com",
          password: "Password123!",
          roleId: role.id,
        }),
      }),
    );

    const user = await prisma.user.findUnique({
      where: { email: "secure@example.com" },
    });

    expect(user?.password).not.toBe("Password123!");
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(403);
  });
});
