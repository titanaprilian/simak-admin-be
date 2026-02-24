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

describe("PATCH /faculties/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
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
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should update faculty successfully as SuperAdmin", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Fakultas Teknologi" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Fakultas Teknologi");
  });

  it("should update faculty successfully with faculty scoped position", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "update" },
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
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Fakultas Teknologi" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Fakultas Teknologi");
  });

  it("should return 403 if user has update permission but no faculty scope", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has faculty scoped position for different faculty", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "update" },
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
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 if faculty not found", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const res = await app.handle(
      new Request("http://localhost/faculties/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 409 if code already exists", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "update" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    await prisma.faculty.createMany({
      data: [
        { code: "FK1", name: "Fakultas Satu" },
        { code: "FK2", name: "Fakultas Dua" },
      ],
    });

    const faculty = await prisma.faculty.findFirst({ where: { code: "FK1" } });

    await assignFacultyPosition({
      userId: user.id,
      facultyId: faculty!.id,
      positionName: "DEKAN",
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ code: "FK2" }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should update faculty in database", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "update" },
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

    await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Fakultas Teknologi" }),
      }),
    );

    const updated = await prisma.faculty.findUnique({
      where: { id: faculty.id },
    });

    expect(updated?.name).toBe("Fakultas Teknologi");
  });
});
