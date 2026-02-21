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

describe("PATCH /rbac/roles/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const payload = {
      name: "Updated Manager",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no RBAC_management update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const payload = {
      name: "Updated Manager",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has RBAC_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Manager" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has RBAC_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Manager" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has update permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Manager" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if trying to update a protected system role (SuperAdmin)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const superAdminRole = await prisma.role.create({
      data: { name: "SuperAdmin", description: "System Root" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${superAdminRole.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "Hacked Admin",
          description: "I should not be able to change this",
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.message).toContain("protected system feature");
  });

  it("should update role name successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "Updated Manager",
          description: "Original",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated Manager");
    expect(body.data.description).toBe("Original");
  });

  it("should update role description successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager", description: "Original" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ description: "Updated description" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Manager");
    expect(body.data.description).toBe("Updated description");
  });

  it("should update description to null", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager", description: "Original" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ description: null }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.description).toBeNull();
  });

  it("should return 404 if role does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Manager" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 if name is empty string", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "" }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should trim whitespace from name", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "  Updated Manager  " }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated Manager");
  });

  it("should return 409 if role name already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role1 = await prisma.role.create({ data: { name: "Manager" } });
    await prisma.role.create({ data: { name: "Admin" } });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role1.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Admin" }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should return 400 if request body is empty", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
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

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Manager" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const role = await prisma.role.create({
      data: { name: "Manager" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated Manager" }),
      }),
    );

    expect(res.status).toBe(403);
  });
});
