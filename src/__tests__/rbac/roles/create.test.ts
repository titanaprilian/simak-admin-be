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

describe("POST /rbac/roles", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a role with permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
    expect(body.data.name).toBe("Support Agent");

    expect(body.data.permissions[1].feature.name).toBe("Settings");
    expect(body.data.permissions[1].canRead).toBe(true);
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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

  it("should return 403 if user has no RBAC_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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

  it("should return 403 if user only has RBAC_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
      { featureName: "user_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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

  it("should return 400 if name is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name is empty string", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
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
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "   ",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name is null", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: null,
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name exceeds maximum length", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "a".repeat(256),
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 if role name already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    await prisma.role.create({
      data: {
        name: "Support Agent",
        description: "Existing role",
      },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should create role successfully without description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("Support Agent");
  });

  it("should create role with null description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: null,
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);
  });

  it("should create role with empty description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);
  });

  it("should create role without permissions array and make it all false", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
    expect(body.data.permissions.length).toBeGreaterThan(0);
    body.data.permissions.forEach((perm: any) => {
      expect(perm.canCreate).toBe(false);
      expect(perm.canRead).toBe(false);
      expect(perm.canUpdate).toBe(false);
      expect(perm.canDelete).toBe(false);
      expect(perm.canPrint).toBe(false);
    });
  });

  it("should create role with empty permissions array", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
    expect(body.data.permissions.length).toBeGreaterThan(0);
    body.data.permissions.forEach((perm: any) => {
      expect(perm.canCreate).toBe(false);
      expect(perm.canRead).toBe(false);
      expect(perm.canUpdate).toBe(false);
      expect(perm.canDelete).toBe(false);
      expect(perm.canPrint).toBe(false);
    });
  });

  it("should return 400 if permissions is not an array", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: "not-an-array",
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if permission is missing featureId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if featureId is invalid (non-existent)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: "non-existent-feature-id",
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if featureId is null", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: null,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should create role with default false for missing action flags", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);

    const body = await res.json();
    const perm = body.data.permissions[0];

    expect(perm.canRead).toBe(false);
    expect(perm.canCreate).toBe(false);
  });

  it("should return 400 if action flags are not boolean", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
          canRead: "yes",
          canCreate: 1,
          canUpdate: null,
          canDelete: undefined,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should create role with multiple permissions on different features", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature1 = await prisma.feature.create({
      data: { name: "Settings" },
    });
    const feature2 = await prisma.feature.create({
      data: { name: "Reports" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature1.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
        {
          featureId: feature2.id,
          canRead: true,
          canCreate: true,
          canUpdate: false,
          canDelete: false,
          canPrint: true,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.permissions).toHaveLength(3);
  });

  it("should return 400 for duplicate featureId in permissions array", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
        {
          featureId: feature.id,
          canRead: false,
          canCreate: true,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return created role with all expected fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("name");
    expect(body.data).toHaveProperty("description");
    expect(body.data).toHaveProperty("permissions");
    expect(body.data).toHaveProperty("createdAt");
    expect(body.data).toHaveProperty("updatedAt");
  });

  it("should include feature details in permission response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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
    expect(body.data.permissions[1].feature).toBeDefined();
    expect(body.data.permissions[1].feature.id).toBe(feature.id);
    expect(body.data.permissions[1].feature.name).toBe("Settings");
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
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
    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
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
      { featureName: "RBAC_management", action: "create" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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

  it("should return 400 for invalid JSON body", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: "{ invalid json }",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 for empty request body", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: "",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should persist role to database correctly", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const feature = await prisma.feature.create({
      data: { name: "Settings" },
    });

    const payload = {
      name: "Support Agent",
      description: "Level 1 Support",
      permissions: [
        {
          featureId: feature.id,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPrint: false,
        },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/roles", {
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

    const dbRole = await prisma.role.findUnique({
      where: { id: body.data.id },
      include: { permissions: true },
    });

    expect(dbRole).not.toBeNull();
    expect(dbRole?.name).toBe("Support Agent");
    expect(dbRole?.permissions).toHaveLength(2);
  });
});
