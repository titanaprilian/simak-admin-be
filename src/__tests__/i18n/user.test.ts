import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("GET /users - List users with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return English message for user list in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Users retrieved successfully");
  });

  it("should return Spanish message for user list in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Usuarios obtenidos exitosamente");
  });

  it("should return Indonesian message for user list in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Pengguna berhasil diambil");
  });
});

describe("POST /users - Create user with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when creating user in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.findUnique({ where: { name: "TestUser" } });

    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          email: "newuser@test.com",
          name: "New User",
          password: "password123",
          roleId: role?.id,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("User Succesfully Created");
  });

  it("should return Spanish message when creating user in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.findUnique({ where: { name: "TestUser" } });

    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          email: "newuser@test.com",
          name: "New User",
          password: "password123",
          roleId: role?.id,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Usuario creado exitosamente");
  });

  it("should return Indonesian message when creating user in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "create" },
    ]);

    const role = await prisma.role.findUnique({ where: { name: "TestUser" } });

    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          email: "newuser@test.com",
          name: "New User",
          password: "password123",
          roleId: role?.id,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toBe("Pengguna berhasil dibuat");
  });
});

describe("GET /users/:id - Get user with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when getting user in English", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("User details retrieved");
  });

  it("should return Spanish message when getting user in Spanish", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Usuario obtenido exitosamente");
  });

  it("should return Indonesian message when getting user in Indonesian", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Pengguna berhasil diambil");
  });

  it("should return 404 with English message when user not found in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/users/nonexistent-id", {
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

  it("should return 404 with Spanish message when user not found in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/users/nonexistent-id", {
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

  it("should return 404 with Indonesian message when user not found in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/users/nonexistent-id", {
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

describe("PATCH /users/:id - Update user with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when updating user in English", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const response = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("User updated successfully");
  });

  it("should return Spanish message when updating user in Spanish", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const response = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Usuario actualizado exitosamente");
  });

  it.only("should return Indonesian message when updating user in Indonesian", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "update" },
    ]);

    const response = await app.handle(
      new Request(`http://localhost/users/${user.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Pengguna berhasil diperbarui");
  });
});

describe("DELETE /users/:id - Delete user with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when deleting user in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const newUser = await prisma.user.create({
      data: {
        id: "user-to-delete-1",
        email: "todelete1@test.com",
        name: "To Delete 1",
        password: await Bun.password.hash("password123"),
        roleId: (await prisma.role.findUnique({ where: { name: "TestUser" } }))!
          .id,
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/users/${newUser.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("User Successfully Deleted");
  });

  it("should return Spanish message when deleting user in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const newUser = await prisma.user.create({
      data: {
        id: "user-to-delete-2",
        email: "todelete2@test.com",
        name: "To Delete 2",
        password: await Bun.password.hash("password123"),
        roleId: (await prisma.role.findUnique({ where: { name: "TestUser" } }))!
          .id,
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/users/${newUser.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Usuario eliminado exitosamente");
  });

  it("should return Indonesian message when deleting user in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "delete" },
    ]);

    const newUser = await prisma.user.create({
      data: {
        id: "user-to-delete-3",
        email: "todelete3@test.com",
        name: "To Delete 3",
        password: await Bun.password.hash("password123"),
        roleId: (await prisma.role.findUnique({ where: { name: "TestUser" } }))!
          .id,
      },
    });

    const response = await app.handle(
      new Request(`http://localhost/users/${newUser.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Pengguna berhasil dihapus");
  });
});
