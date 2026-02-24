import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /positions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "DEKAN",
          scopeType: "FACULTY",
        }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "DEKAN",
          scopeType: "FACULTY",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should create position with FACULTY scope", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "DEKAN",
          scopeType: "FACULTY",
          isSingleSeat: true,
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.name).toBe("DEKAN");
    expect(body.data.scopeType).toBe("FACULTY");
    expect(body.data.isSingleSeat).toBe(true);
  });

  it("should create position with STUDY_PROGRAM scope", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "KAPRODI",
          scopeType: "STUDY_PROGRAM",
          isSingleSeat: true,
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.name).toBe("KAPRODI");
    expect(body.data.scopeType).toBe("STUDY_PROGRAM");
  });

  it("should create position with default isSingleSeat false", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "SEKRETARIS",
          scopeType: "FACULTY",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.isSingleSeat).toBe(false);
  });

  it("should return 400 when name is too short", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "A",
          scopeType: "FACULTY",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when name is too long", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "A".repeat(101),
          scopeType: "FACULTY",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when scopeType is invalid", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "DEKAN",
          scopeType: "INVALID",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 when position name already exists", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.position.create({
      data: {
        name: "DEKAN",
        scopeType: "FACULTY",
      },
    });

    const res = await app.handle(
      new Request("http://localhost/positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "DEKAN",
          scopeType: "FACULTY",
        }),
      }),
    );

    expect(res.status).toBe(409);
  });
});
