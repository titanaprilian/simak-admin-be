import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /educational-programs", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/educational-programs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Test", level: "S1" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/educational-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Test", level: "S1" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should create program successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      name: "Teknik Informatika",
      level: "S1",
    };

    const res = await app.handle(
      new Request("http://localhost/educational-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.name).toBe("Teknik Informatika");
    expect(body.data.level).toBe("S1");
  });

  it("should return 400 if name is missing", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      level: "S1",
    };

    const res = await app.handle(
      new Request("http://localhost/educational-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if level is missing", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/educational-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name is too short", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      name: "A",
      level: "S1",
    };

    const res = await app.handle(
      new Request("http://localhost/educational-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });
});
