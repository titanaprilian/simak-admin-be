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

describe("DELETE /positions/assignments/:id", () => {
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
        method: "DELETE",
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without delete permission", async () => {
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
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete assignment successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "delete" },
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
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const deleted = await prisma.positionAssignment.findUnique({
      where: { id: assignment.id },
    });
    expect(deleted).toBeNull();
  });

  it("should return 404 when assignment does not exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return deleted assignment data", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "delete" },
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
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(assignment.id);
    expect(body.data.position.name).toBe(facultyPosition.name);
  });
});
