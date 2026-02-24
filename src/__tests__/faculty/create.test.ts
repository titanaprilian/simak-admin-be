import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  assignFacultyPosition,
  assignStudyProgramPosition,
  createAuthenticatedUser,
  createAuthenticatedSuperAdmin,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /faculties", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = { code: "FK", name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const payload = { code: "FK", name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const payload = { code: "FK", name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should create faculty successfully with RBAC create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "create" },
    ]);

    const payload = { code: "FK", name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
          "accept-language": "en",
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.code).toBe("FK");
  });

  it("should return 403 if user has faculty-scoped position but no create permission", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
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

    const payload = { code: "FK2", name: "Fakultas Lain" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
          "accept-language": "en",
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.message).toBe(
      "Forbidden: You do not have 'create' permission for 'faculty_management'",
    );
  });

  it("should return 403 if user has study_program-scoped position but no create permission", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const studyProgram = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
    });

    await assignStudyProgramPosition({
      userId: user.id,
      studyProgramId: studyProgram.id,
      positionName: "KAPRODI",
    });

    const payload = { code: "FK2", name: "Fakultas Lain" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
          "accept-language": "en",
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.message).toBe(
      "Forbidden: You do not have 'create' permission for 'faculty_management'",
    );
  });

  it("should create faculty successfully as SuperAdmin", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const payload = { code: "FK", name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.code).toBe("FK");
    expect(body.data.name).toBe("Fakultas Teknik");
  });

  it("should return 400 if code is missing", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const payload = { name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if name is missing", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const payload = { code: "FK" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 if code already exists", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    await prisma.faculty.create({
      data: { code: "FK", name: "Existing Faculty" },
    });

    const payload = { code: "FK", name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should return 400 if code is too long", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const payload = { code: "A".repeat(21), name: "Fakultas Teknik" };

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should save faculty to database", async () => {
    await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "faculty_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedSuperAdmin();

    const payload = { code: "FK", name: "Fakultas Teknik" };

    await app.handle(
      new Request("http://localhost/faculties", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const faculty = await prisma.faculty.findUnique({
      where: { code: "FK" },
    });

    expect(faculty).not.toBeNull();
    expect(faculty?.name).toBe("Fakultas Teknik");
  });
});
