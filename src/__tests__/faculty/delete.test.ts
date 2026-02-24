import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  assignFacultyPosition,
  createAuthenticatedUser,
  createAuthenticatedSuperAdmin,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("DELETE /faculties/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        method: "DELETE",
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete faculty successfully as SuperAdmin", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const deleted = await prisma.faculty.findUnique({
      where: { id: faculty.id },
    });

    expect(deleted).toBeNull();
  });

  it("should return 400 if faculty has position assignments", async () => {
    const role = await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "delete" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await assignFacultyPosition({
      userId: user.id,
      facultyId: faculty.id,
      positionName: "DEKAN",
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 403 if user has delete permission but no faculty scope", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has faculty scoped position for different faculty", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "delete" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const faculty1 = await prisma.faculty.create({
      data: { code: "FK1", name: "Fakultas Satu" },
    });

    const faculty2 = await prisma.faculty.create({
      data: { code: "FK2", name: "Fakultas Dua" },
    });

    await assignFacultyPosition({
      userId: user.id,
      facultyId: faculty1.id,
      positionName: "DEKAN",
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty2.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 if faculty not found", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const res = await app.handle(
      new Request("http://localhost/faculties/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });
});
