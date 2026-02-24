import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createLecturerTestFixture,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("DELETE /lecturers/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/lecturers/some-id", {
        method: "DELETE",
        headers: {
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/lecturers/some-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete lecturer successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "delete" },
    ]);

    const { lecturer } = await createLecturerTestFixture();

    const res = await app.handle(
      new Request(`http://localhost/lecturers/${lecturer.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const deleted = await prisma.lecturer.findUnique({
      where: { id: lecturer.id },
    });

    expect(deleted).toBeNull();
  });

  it("should return 404 if lecturer not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/lecturers/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should keep user after deleting lecturer", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "delete" },
    ]);

    const { lecturer, user } = await createLecturerTestFixture();

    const res = await app.handle(
      new Request(`http://localhost/lecturers/${lecturer.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const userStillExists = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(userStillExists).not.toBeNull();
  });
});
