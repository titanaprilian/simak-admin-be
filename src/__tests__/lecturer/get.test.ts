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

describe("GET /lecturers/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/lecturers/some-id", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/lecturers/some-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return lecturer by id", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const { lecturer } = await createLecturerTestFixture();

    const res = await app.handle(
      new Request(`http://localhost/lecturers/${lecturer.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nidn).toBe("001");
    expect(body.data.fullName).toBe("Dr. Budi");
  });

  it("should return 404 if lecturer not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/lecturers/non-existent-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should include user and studyProgram in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const { lecturer } = await createLecturerTestFixture();

    const res = await app.handle(
      new Request(`http://localhost/lecturers/${lecturer.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.user).toBeDefined();
    expect(body.data.user.email).toBe("budi@test.com");
    expect(body.data.studyProgram).toBeDefined();
    expect(body.data.studyProgram.code).toBe("TI");
  });
});
