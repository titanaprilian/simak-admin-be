import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
  createPositionTestFixture,
  createPositionAssignment,
} from "../../test_utils";

describe("PATCH /positions/assignments/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();
    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should update assignment isActive", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(false);
  });

  it("should update assignment endDate", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ endDate: "2026-12-31" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.endDate).toBe("2026-12-31T00:00:00.000Z");
  });

  it("should update assignment userId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const user2Role = await prisma.role.create({ data: { name: "User2Role" } });
    const user2 = await prisma.user.create({
      data: {
        loginId: "user2",
        email: "user2@test.com",
        password: "hashed",
        roleId: user2Role.id,
      },
    });

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ userId: user2.id }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.user.id).toBe(user2.id);
  });

  it("should return 200 when update body is empty (idempotent)", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
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

  it("should return 404 when assignment does not exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 when endDate is before startDate", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          startDate: "2026-12-31",
          endDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 when updating to occupied single-seat", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment1 = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const user2Role = await prisma.role.create({ data: { name: "User2Role" } });
    const user2 = await prisma.user.create({
      data: {
        loginId: "user2",
        email: "user2@test.com",
        password: "hashed",
        roleId: user2Role.id,
      },
    });

    const assignment2 = await createPositionAssignment({
      userId: user2.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2025-01-01",
      isActive: false,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment2.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: true }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should allow updating to same user when single-seat", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });
    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const assignment = await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ endDate: "2026-12-31" }),
      }),
    );

    expect(res.status).toBe(200);
  });
});
