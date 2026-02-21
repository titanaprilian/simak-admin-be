import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("GET /rbac/features - List features with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
  });
});

describe("POST /rbac/features - Create feature with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          name: "TestFeature",
          description: "Test Description",
          defaultPermissions: {},
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Feature created successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          name: "TestFeature",
          description: "Test Description",
          defaultPermissions: {},
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Característica creada exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/features", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          name: "TestFeature",
          description: "Test Description",
          defaultPermissions: {},
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Fitur berhasil dibuat");
  });
});

describe("PATCH /rbac/features/:id - Update feature with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: {
        name: "TestFeatureUpdate",
        description: "Original Description",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          description: "Updated Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Feature updated successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: {
        name: "TestFeatureUpdate",
        description: "Original Description",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          description: "Updated Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Característica actualizada exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const feature = await prisma.feature.create({
      data: {
        name: "TestFeatureUpdate",
        description: "Original Description",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          description: "Updated Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Fitur berhasil diperbarui");
  });
});

describe("DELETE /rbac/features/:id - Delete feature with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: {
        name: "TestFeatureDelete",
        description: "To be deleted",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Feature deleted successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: {
        name: "TestFeatureDelete2",
        description: "To be deleted",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Característica eliminada exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const feature = await prisma.feature.create({
      data: {
        name: "TestFeatureDelete3",
        description: "To be deleted",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/features/${feature.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Fitur berhasil dihapus");
  });
});

describe("GET /rbac/roles - List roles with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
  });
});

describe("POST /rbac/roles - Create role with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          name: "TestRole",
          description: "Test Role Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Role created successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          name: "TestRole",
          description: "Test Role Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Rol creado exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "create" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          name: "TestRole",
          description: "Test Role Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Peran berhasil dibuat");
  });
});

describe("GET /rbac/roles/:id - Get role with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return 404 English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles/nonexistent-id", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.message).toBe("Resource not found");
  });

  it("should return 404 Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles/nonexistent-id", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.message).toBe("No encontrado");
  });

  it("should return 404 Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/rbac/roles/nonexistent-id", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.message).toBe("Tidak Ditemukan");
  });
});

describe("PATCH /rbac/roles/:id - Update role with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: {
        name: "TestRoleUpdate",
        description: "Original Description",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          description: "Updated Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Role updated successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: {
        name: "TestRoleUpdate2",
        description: "Original Description",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          description: "Updated Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Rol actualizado exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "update" },
    ]);

    const role = await prisma.role.create({
      data: {
        name: "TestRoleUpdate3",
        description: "Original Description",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          description: "Updated Description",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Peran berhasil diperbarui");
  });
});

describe("DELETE /rbac/roles/:id - Delete role with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: {
        name: "TestRoleDelete",
        description: "To be deleted",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Role deleted successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: {
        name: "TestRoleDelete2",
        description: "To be deleted",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Rol eliminado exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "RBAC_management", action: "delete" },
    ]);

    const role = await prisma.role.create({
      data: {
        name: "TestRoleDelete3",
        description: "To be deleted",
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Peran berhasil dihapus");
  });
});
