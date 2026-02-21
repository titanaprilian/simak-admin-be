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

describe("PATCH /rbac/features/:id", () => {
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

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

  it("should return 403 if user only has RBAC_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

  it("should return 403 if user has update permission on different feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

  it("should update feature name successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original description" },
    });

    const payload = {
      name: "updated_order_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated_order_management");
    expect(body.data.description).toBe("Original description");
  });

  it("should update feature description successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original description" },
    });

    const payload = {
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("order_management");
    expect(body.data.description).toBe("Updated description");
  });

  it("should update both name and description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original description" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated_order_management");
    expect(body.data.description).toBe("Updated description");
  });

  it("should update description to null", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original description" },
    });

    const payload = {
      description: null,
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.description).toBeNull();
  });

  it("should update description to empty string", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original description" },
    });

    const payload = {
      description: "",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should return 404 if feature does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 if feature ID is invalid format", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features/invalid-id-format", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect([400, 404]).toContain(res.status);
  });

  it("should return 400 if name is empty string", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name is only whitespace", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "   ",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name is less than 3 characters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "ab",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name exceeds 50 characters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "a".repeat(51),
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should trim whitespace from name", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "  updated_order_management  ",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated_order_management");
  });

  it("should accept name at minimum length (3 characters)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "abc",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should accept name at maximum length (50 characters)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "a".repeat(50),
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should return 409 if updated name already exists on another feature", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature1 = await prisma.feature.create({
      data: { name: "order_management" },
    });

    await prisma.feature.create({
      data: { name: "user_management" },
    });

    const payload = {
      name: "user_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature1.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should allow updating feature with same name (no change)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should handle case-insensitive duplicate names", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature1 = await prisma.feature.create({
      data: { name: "order_management" },
    });

    await prisma.feature.create({
      data: { name: "user_management" },
    });

    const payload = {
      name: "USER_MANAGEMENT",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature1.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect([200, 409]).toContain(res.status);
  });

  it("should return 400 if request body is empty", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

  it("should return updated feature with all expected fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("name");
    expect(body.data).toHaveProperty("description");
    expect(body.data.id).toBe(feature.id);
  });

  it("should persist changes to database correctly", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original" },
    });

    const payload = {
      name: "updated_order_management",
      description: "Updated description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(200);

    const dbFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
    });

    expect(dbFeature?.name).toBe("updated_order_management");
    expect(dbFeature?.description).toBe("Updated description");
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

    const payload = {
      name: "updated_order_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is invalid", async () => {
    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
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

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
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

  it("should return 401 if token version is outdated", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "updated_order_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid JSON body", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management" },
    });

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: "{ invalid json }",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should allow updating only name", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original" },
    });

    const payload = {
      name: "updated_order_management",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated_order_management");
    expect(body.data.description).toBe("Original");
  });

  it("should allow updating only description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "order_management", description: "Original" },
    });

    const payload = {
      description: "New description",
    };

    const res = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("order_management");
    expect(body.data.description).toBe("New description");
  });
});
