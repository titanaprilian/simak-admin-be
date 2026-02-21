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

describe("DELETE /rbac/roles/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const role = await prisma.role.create({
      data: { name: "TempRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no RBAC_management delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const role = await prisma.role.create({
      data: { name: "TempRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
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
      data: { name: "TempRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
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

    const role = await prisma.role.create({
      data: { name: "TempRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has RBAC_management update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: { name: "TempRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
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
      { featureName: "user_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "TempRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete role successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "OldRole", description: "Deprecated" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Role deleted successfully");
  });

  it("should remove role from database", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "TemporaryRole" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const dbRole = await prisma.role.findUnique({
      where: { id: role.id },
    });

    expect(dbRole).toBeNull();
  });

  it("should return 404 if role does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 404 when deleting already deleted role", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "DoubleDeleteRole" },
    });

    const firstDelete = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(firstDelete.status).toBe(200);

    const secondDelete = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(secondDelete.status).toBe(404);
  });

  it("should delete role and cascade delete its permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "RoleWithPerms" },
    });

    const feature = await prisma.feature.create({
      data: { name: "SomeFeature" },
    });

    await prisma.roleFeature.create({
      data: {
        roleId: role.id,
        featureId: feature.id,
        canRead: true,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const dbRole = await prisma.role.findUnique({ where: { id: role.id } });
    expect(dbRole).toBeNull();

    const permissions = await prisma.roleFeature.findMany({
      where: { roleId: role.id },
    });
    expect(permissions).toHaveLength(0);
  });

  it("should prevent deletion if role is currently assigned to users", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const roleToCheck = await prisma.role.create({
      data: { name: "ActiveManager" },
    });

    await prisma.user.create({
      data: {
        email: "active_user@test.com",
        password: "hashedpassword",
        name: "Active User",
        roleId: roleToCheck.id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${roleToCheck.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(
      "Invalid Reference: The 'roleId' does not exist.",
    );

    const dbRole = await prisma.role.findUnique({
      where: { id: roleToCheck.id },
    });
    expect(dbRole).not.toBeNull();
  });

  it("should prevent deletion if role is a protected system role", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const systemRole = await prisma.role.upsert({
      where: { name: "SuperAdmin" },
      update: {},
      create: { name: "SuperAdmin", description: "Root" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${systemRole.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/protected/i);
  });

  it("should return deleted role data in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "DeletedRole", description: "Gone" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(role.id);
    expect(body.data.name).toBe("DeletedRole");
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const role = await prisma.role.create({ data: { name: "Temp" } });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is tampered", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const token = authHeaders.Authorization.split(" ")[1];
    const tamperedToken = token.slice(0, -5) + "fake";

    const role = await prisma.role.create({ data: { name: "Temp" } });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
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
      { featureName: "RBAC_management", action: "delete" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const role = await prisma.role.create({ data: { name: "Temp" } });

    const res = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should handle concurrent deletion attempts safely", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: { name: "RaceConditionRole" },
    });

    const [first, second, third] = await Promise.all([
      app.handle(
        new Request(`http://localhost/rbac/roles/${role.id}`, {
          method: "DELETE",
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request(`http://localhost/rbac/roles/${role.id}`, {
          method: "DELETE",
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request(`http://localhost/rbac/roles/${role.id}`, {
          method: "DELETE",
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
    ]);

    const statuses = [first.status, second.status, third.status].sort();

    const successCount = statuses.filter((s) => s === 200).length;
    const notFoundCount = statuses.filter((s) => s === 404).length;

    expect(successCount).toBe(1);
    expect(notFoundCount).toBe(2);
  });
});
