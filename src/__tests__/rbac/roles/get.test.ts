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

describe("GET /rbac/roles/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const TARGET_URL = (id: string) => `http://localhost/rbac/roles/${id}`;

  // =========================================
  // AUTHENTICATION TESTS (401)
  // =========================================

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request(TARGET_URL("some-id"), {
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
      new Request(TARGET_URL("some-id"), {
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
      new Request(TARGET_URL("some-id"), {
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  // =========================================
  // AUTHORIZATION TESTS (403)
  // =========================================

  it("should return 403 if user lacks 'read' permission for RBAC_management", async () => {
    // 1. Create a user who has NO permissions for RBAC
    const { authHeaders } = await createAuthenticatedUser();
    // Note: By default createAuthenticatedUser creates a role with NO permissions unless specified

    // 2. Create a target role to try and fetch
    const targetRole = await prisma.role.create({
      data: { name: "TargetRole", description: "Target" },
    });

    const res = await app.handle(
      new Request(TARGET_URL(targetRole.id), {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  // =========================================
  // NOT FOUND TESTS (404)
  // =========================================

  it("should return 404 if role ID does not exist", async () => {
    // 1. Create a user WITH permissions to read RBAC
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    // 2. Request a non-existent UUID
    const nonExistentId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID format but fake
    const res = await app.handle(
      new Request(TARGET_URL(nonExistentId), {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.message).toContain("Resource not found");
  });

  // =========================================
  // SUCCESS TESTS (200)
  // =========================================

  it("should return role details with permissions when authorized", async () => {
    // 1. Create Admin User (The Requester)
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    // 2. Create the Target Role (The Resource being fetched)
    const targetRole = await prisma.role.create({
      data: { name: "Editor", description: "Editor Role" },
    });

    // 3. Add permissions to the Target Role
    const feature = await prisma.feature.create({
      data: { name: "Articles", description: "Article management" },
    });

    await prisma.roleFeature.create({
      data: {
        roleId: targetRole.id,
        featureId: feature.id,
        canRead: true,
        canCreate: true,
      },
    });

    const res = await app.handle(
      new Request(TARGET_URL(targetRole.id), {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(targetRole.id);
    expect(body.data.name).toBe("Editor");
    expect(body.data.permissions).toHaveLength(1);
    expect(body.data.permissions[0].feature.name).toBe("Articles");
    expect(body.data.permissions[0].canRead).toBe(true);
  });

  it("should return permissions sorted alphabetically by feature name", async () => {
    // 1. Create Admin User
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    // 2. Create Target Role
    const targetRole = await prisma.role.create({
      data: { name: "ComplexRole" },
    });

    // 3. Create Features (Zebra and Alpha) to test sorting
    const featureZ = await prisma.feature.create({ data: { name: "Zebra" } });
    const featureA = await prisma.feature.create({ data: { name: "Alpha" } });

    // 4. Assign permissions
    await prisma.roleFeature.createMany({
      data: [
        { roleId: targetRole.id, featureId: featureZ.id },
        { roleId: targetRole.id, featureId: featureA.id },
      ],
    });

    const res = await app.handle(
      new Request(TARGET_URL(targetRole.id), {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.permissions).toHaveLength(2);

    // Check Order: Alpha should be first, Zebra second
    expect(body.data.permissions[0].feature.name).toBe("Alpha");
    expect(body.data.permissions[1].feature.name).toBe("Zebra");
  });

  it("should return empty permissions array if role has none", async () => {
    // 1. Create Admin User
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    // 2. Create Target Role with NO permissions
    const targetRole = await prisma.role.create({
      data: { name: "EmptyRole" },
    });

    const res = await app.handle(
      new Request(TARGET_URL(targetRole.id), {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("EmptyRole");
    expect(body.data.permissions).toEqual([]);
  });
});
