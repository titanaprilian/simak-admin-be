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

describe("PATCH /lecturers/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/lecturers/some-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/lecturers/some-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should update lecturer successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "update" },
    ]);

    const { lecturer } = await createLecturerTestFixture();

    const res = await app.handle(
      new Request(`http://localhost/lecturers/${lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "Dr. Budi Santoso" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.fullName).toBe("Dr. Budi Santoso");
  });

  it("should return 404 if lecturer not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/lecturers/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should update gender field", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "update" },
    ]);

    const { lecturer } = await createLecturerTestFixture();

    const res = await app.handle(
      new Request(`http://localhost/lecturers/${lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ gender: "FEMALE" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.gender).toBe("FEMALE");
  });
});
