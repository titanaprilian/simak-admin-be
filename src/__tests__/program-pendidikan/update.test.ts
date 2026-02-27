import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("PATCH /educational-programs/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/educational-programs/some-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/educational-programs/some-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when program not found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/educational-programs/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should update program successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const program = await prisma.educationalProgram.create({
      data: { name: "Teknik Informatika", level: "S1" },
    });

    const res = await app.handle(
      new Request(`http://localhost/educational-programs/${program.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Industri" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Teknik Industri");
    expect(body.data.level).toBe("S1");
  });

  it("should return 400 if no fields provided for update", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const program = await prisma.educationalProgram.create({
      data: { name: "Teknik Informatika", level: "S1" },
    });

    const res = await app.handle(
      new Request(`http://localhost/educational-programs/${program.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
  });
});
