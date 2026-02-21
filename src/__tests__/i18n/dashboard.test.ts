import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("GET /dashboard - Dashboard with i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return English message in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "dashboard", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/dashboard", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Dashboard data retrieved successfully");
  });

  it("should return Spanish message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "dashboard", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/dashboard", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Datos del panel obtenidos exitosamente");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "dashboard", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/dashboard", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Data dashboard berhasil diambil");
  });
});
