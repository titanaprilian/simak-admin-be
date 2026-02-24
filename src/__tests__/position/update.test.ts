import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("PATCH /positions/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "WAKIL_DEKAN" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "WAKIL_DEKAN" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should update position name", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY", isSingleSeat: true },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "WAKIL_DEKAN" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("WAKIL_DEKAN");
  });

  it("should update position isSingleSeat", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY", isSingleSeat: true },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isSingleSeat: false }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.isSingleSeat).toBe(false);
  });

  it("should update position scopeType", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ scopeType: "STUDY_PROGRAM" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.scopeType).toBe("STUDY_PROGRAM");
  });

  it("should return 200 when update body is empty (idempotent)", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should return 404 when position does not exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "WAKIL_DEKAN" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 409 when updating to existing position name", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.position.createMany({
      data: [
        { name: "DEKAN", scopeType: "FACULTY" },
        { name: "WAKIL_DEKAN", scopeType: "FACULTY" },
      ],
    });

    const position = await prisma.position.findFirst({
      where: { name: "DEKAN" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "WAKIL_DEKAN" }),
      }),
    );

    expect(res.status).toBe(409);
  });
});
