import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /educational-programs/options", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/educational-programs/options", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/educational-programs/options", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return empty list when no programs exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/educational-programs/options", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should return options with id, name, and level", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.educationalProgram.createMany({
      data: [
        { name: "Teknik Informatika", level: "S1" },
        { name: "Sistem Informasi", level: "S1" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/educational-programs/options", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("name");
    expect(body.data[0]).toHaveProperty("level");
    expect(body.data[0]).not.toHaveProperty("createdAt");
    expect(body.data[0]).not.toHaveProperty("updatedAt");
  });

  it("should paginate options", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.educationalProgram.createMany({
      data: [
        { name: "Program 1", level: "S1" },
        { name: "Program 2", level: "S1" },
        { name: "Program 3", level: "S2" },
      ],
    });

    const res = await app.handle(
      new Request(
        "http://localhost/educational-programs/options?page=1&limit=2",
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(3);
  });

  it("should search options by name or level", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.educationalProgram.createMany({
      data: [
        { name: "Teknik Informatika", level: "S1" },
        { name: "Sistem Informasi", level: "S1" },
        { name: "Magister Komputer", level: "S2" },
      ],
    });

    const res = await app.handle(
      new Request(
        "http://localhost/educational-programs/options?search=Teknik",
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Teknik Informatika");
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/educational-programs/options", {
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toBe(
      "Opciones de programa educativo recuperadas exitosamente",
    );
  });
});
