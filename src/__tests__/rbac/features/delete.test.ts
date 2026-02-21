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

describe("DELETE /rbac/features/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete feature successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Test feature" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Feature deleted successfully");
  });

  it("should remove feature from database", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const dbFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
    });

    expect(dbFeature).toBeNull();
  });

  it("should return 404 if feature does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 if feature ID is invalid format", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features/invalid-id-format", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect([400, 404]).toContain(res.status);
  });

  it("should return 404 when deleting already deleted feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const firstDelete = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(firstDelete.status).toBe(200);

    const secondDelete = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(secondDelete.status).toBe(404);
  });

  it("should delete feature and cascade delete associated permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const role = await prisma.role.create({
      data: { name: "TestRole" },
    });

    await prisma.roleFeature.create({
      data: {
        roleId: role.id,
        featureId: feature.id,
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPrint: false,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const dbFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
    });
    expect(dbFeature).toBeNull();

    const permissions = await prisma.roleFeature.findMany({
      where: { featureId: feature.id },
    });
    expect(permissions).toHaveLength(0);
  });

  it("should handle deletion when feature has multiple role permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const role1 = await prisma.role.create({
      data: { name: "Role1" },
    });
    const role2 = await prisma.role.create({
      data: { name: "Role2" },
    });
    const role3 = await prisma.role.create({
      data: { name: "Role3" },
    });

    await prisma.roleFeature.createMany({
      data: [
        {
          roleId: role1.id,
          featureId: feature.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
        {
          roleId: role2.id,
          featureId: feature.id,
          canRead: true,
          canCreate: true,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
        {
          roleId: role3.id,
          featureId: feature.id,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: false,
          canPrint: false,
        },
      ],
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const permissions = await prisma.roleFeature.findMany({
      where: { featureId: feature.id },
    });
    expect(permissions).toHaveLength(0);
  });

  it("should prevent deletion if feature is a system/protected feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const systemFeature = await prisma.feature.findFirstOrThrow({
      where: {
        name: "RBAC_management",
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${systemFeature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("protected system feature");

    const dbFeature = await prisma.feature.findUnique({
      where: { id: systemFeature.id },
    });
    expect(dbFeature).not.toBeNull();
  });

  it("should return deleted feature data in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Test feature" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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
    expect(body.data.id).toBe(feature.id);
    expect(body.data.name).toBe("order_management");
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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
    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer invalid-token",
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
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
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
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
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should handle concurrent deletion attempts safely", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const [first, second, third] = await Promise.all([
      app.handle(
        new Request(`http://localhost/rbac/features/${feature.id}`, {
          method: "DELETE",
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        }),
      ),
      app.handle(
        new Request(`http://localhost/rbac/features/${feature.id}`, {
          method: "DELETE",
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        }),
      ),
      app.handle(
        new Request(`http://localhost/rbac/features/${feature.id}`, {
          method: "DELETE",
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        }),
      ),
    ]);

    const statuses = [first.status, second.status, third.status].sort();

    const successCount = statuses.filter((s) => s === 200).length;
    const notFoundCount = statuses.filter((s) => s === 404).length;

    expect(successCount).toBe(1);
    expect(notFoundCount).toBe(2);
  });

  it("should allow different users with permission to delete features", async () => {
    await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const adminRole = await prisma.role.upsert({
      where: { name: "AdminUser" },
      update: {},
      create: { name: "AdminUser", description: "Admin role" },
    });
    const user2 = await createAuthenticatedUser({
      id: "cml3d8f5r00002a6hetsp193c",
      email: "newuser@gmail.com",
      roleId: adminRole.id,
    });
    await createTestRoleWithPermissions("AdminUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...user2.authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const dbFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
    });
    expect(dbFeature).toBeNull();
  });

  it("should handle deletion of feature currently assigned to users' roles", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const testUserRole = await prisma.role.findFirst({
      where: { name: "TestUser" },
    });

    await prisma.roleFeature.create({
      data: {
        roleId: testUserRole!.id,
        featureId: feature.id,
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPrint: false,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const dbFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
    });
    expect(dbFeature).toBeNull();

    const permissions = await prisma.roleFeature.findMany({
      where: { featureId: feature.id },
    });
    expect(permissions).toHaveLength(0);
  });

  it("should return 404 for empty feature ID", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/features/", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect([404, 405]).toContain(res.status);
  });
});
