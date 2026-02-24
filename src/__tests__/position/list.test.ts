import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /positions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/positions", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/positions", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should list positions with read permission", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.position.createMany({
      data: [
        { name: "DEKAN", scopeType: "FACULTY" },
        { name: "WAKIL_DEKAN", scopeType: "FACULTY" },
        { name: "KAPRODI", scopeType: "STUDY_PROGRAM" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/positions?page=1&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);
    expect(body.pagination.total).toBe(3);
  });

  it("should filter positions by scopeType", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.position.createMany({
      data: [
        { name: "DEKAN", scopeType: "FACULTY" },
        { name: "WAKIL_DEKAN", scopeType: "FACULTY" },
        { name: "KAPRODI", scopeType: "STUDY_PROGRAM" },
      ],
    });

    const res = await app.handle(
      new Request(
        "http://localhost/positions?page=1&limit=10&scopeType=FACULTY",
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.every((p: any) => p.scopeType === "FACULTY")).toBe(true);
  });

  it("should search positions by name", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.position.createMany({
      data: [
        { name: "DEKAN", scopeType: "FACULTY" },
        { name: "WAKIL_DEKAN", scopeType: "FACULTY" },
        { name: "KAPRODI", scopeType: "STUDY_PROGRAM" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/positions?page=1&limit=10&search=DEKAN", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("should paginate positions", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    await prisma.position.createMany({
      data: [
        { name: "DEKAN", scopeType: "FACULTY" },
        { name: "WAKIL_DEKAN", scopeType: "FACULTY" },
        { name: "KAPRODI", scopeType: "STUDY_PROGRAM" },
        { name: "SEKRETARIS", scopeType: "FACULTY" },
        { name: "BENDAHARA", scopeType: "FACULTY" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/positions?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
  });

  it("should return empty list when no positions exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions?page=1&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });
});
