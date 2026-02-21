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

describe("POST /rbac/features", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should create feature successfully with all permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
    expect(body.data.name).toBe("order_management");
    expect(body.data.description).toBe("Order management feature");
    expect(body.message).toBe("Feature created successfully");
  });

  it("should create feature successfully with partial permissions", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
    expect(body.data.name).toBe("order_management");
  });

  it("should create feature successfully with all permissions false", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canPrint: false,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 400 if name is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 400 if name is less than 3 characters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "ab",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 400 if name exceeds 50 characters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "a".repeat(51),
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should trim whitespace from name", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "  order_management  ",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
    expect(body.data.name).toBe("order_management");
  });

  it("should accept name at minimum length (3 characters)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "abc",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should accept name at maximum length (50 characters)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "a".repeat(50),
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 409 if feature name already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should handle case-insensitive duplicate feature names", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    await prisma.feature.create({
      data: { name: "order_management" },
    });

    const payload = {
      name: "ORDER_MANAGEMENT",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect([201, 409]).toContain(res.status);
  });

  it("should create feature successfully without description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should create feature successfully with null description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: null,
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should create feature successfully with empty description", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 400 if defaultPermissions is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 400 if defaultPermissions is null", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: null,
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 400 if defaultPermissions is not an object", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: "not-an-object",
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return 201 even if canCreate is missing (default to false)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(201);

    const savedFeature = await prisma.feature.findUnique({
      where: { name: "order_management" },
    });
    expect(savedFeature).not.toBeNull();

    const savedRoleFeature = await prisma.roleFeature.findFirst({
      where: {
        featureId: savedFeature!.id,
      },
    });
    expect(savedRoleFeature).not.toBeNull();
    expect(savedRoleFeature?.canCreate).toBe(false);
  });

  it("should return 201 if canRead is missing (default to false)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(201);

    const savedFeature = await prisma.feature.findUnique({
      where: { name: "order_management" },
    });
    expect(savedFeature).not.toBeNull();

    const savedRoleFeature = await prisma.roleFeature.findFirst({
      where: {
        featureId: savedFeature!.id,
      },
    });
    expect(savedRoleFeature).not.toBeNull();
    expect(savedRoleFeature?.canRead).toBe(false);
  });

  it("should return 201 even if canUpdate is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);

    const savedFeature = await prisma.feature.findUnique({
      where: { name: "order_management" },
    });
    expect(savedFeature).not.toBeNull();

    const savedRoleFeature = await prisma.roleFeature.findFirst({
      where: {
        featureId: savedFeature!.id,
      },
    });
    expect(savedRoleFeature).not.toBeNull();
    expect(savedRoleFeature?.canUpdate).toBe(false);
  });

  it("should return 201 if canDelete is missing (default to false)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);

    const savedFeature = await prisma.feature.findUnique({
      where: { name: "order_management" },
    });
    expect(savedFeature).not.toBeNull();

    const savedRoleFeature = await prisma.roleFeature.findFirst({
      where: {
        featureId: savedFeature!.id,
      },
    });
    expect(savedRoleFeature).not.toBeNull();
    expect(savedRoleFeature?.canDelete).toBe(false);
  });

  it("should return 201 if canPrint is missing (default to false)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(201);

    const savedFeature = await prisma.feature.findUnique({
      where: { name: "order_management" },
    });
    expect(savedFeature).not.toBeNull();

    const savedRoleFeature = await prisma.roleFeature.findFirst({
      where: {
        featureId: savedFeature!.id,
      },
    });
    expect(savedRoleFeature).not.toBeNull();
    expect(savedRoleFeature?.canPrint).toBe(false);
  });

  it("should return 400 if permission flags are not boolean", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: "yes",
        canRead: 1,
        canUpdate: null,
        canDelete: undefined,
        canPrint: "true",
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

  it("should return created feature with all expected fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
  });

  it("should return 401 if access token is expired", async () => {
    const { user } = await createAuthenticatedUser();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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
      new Request("http://localhost/rbac/features", {
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
      new Request("http://localhost/rbac/features", {
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

  it("should persist feature to database correctly", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
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

    const dbFeature = await prisma.feature.findUnique({
      where: { id: body.data.id },
    });

    expect(dbFeature).not.toBeNull();
    expect(dbFeature?.name).toBe("order_management");
    expect(dbFeature?.description).toBe("Order management feature");
  });

  it("should return 401 if token version is outdated", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const payload = {
      name: "order_management",
      description: "Order management feature",
      defaultPermissions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canPrint: true,
      },
    };

    const res = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });
});
