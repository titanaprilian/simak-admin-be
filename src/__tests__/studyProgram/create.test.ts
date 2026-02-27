import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  assignFacultyPosition,
  assignStudyProgramPosition,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /study-programs", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      facultyId: "test",
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Teknik Informatika", level: "S1" },
    });

    const payload = {
      facultyId: faculty.id,
      code: "TI",
      name: "Teknik Informatika",
      educationalProgramId: educationalProgram.id,
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should create study program successfully with faculty-scoped position", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Teknik Informatika", level: "S1" },
    });

    await assignFacultyPosition({
      userId: user.id,
      facultyId: faculty.id,
      positionName: "DEKAN",
    });

    const payload = {
      facultyId: faculty.id,
      educationalProgramId: educationalProgram.id,
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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
    expect(body.data.code).toBe("TI");
    expect(body.data.name).toBe("Teknik Informatika");
    expect(body.data.educationalProgramId).toBe(educationalProgram.id);
  });

  it("should create study program successfully with RBAC create permission", async () => {
    const role = await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "studyProgram_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const payload = {
      facultyId: faculty.id,
      code: "TI",
      name: "Teknik Informatika",
      educationalProgramId: educationalProgram.id,
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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
    expect(body.data.code).toBe("TI");
  });

  it("should return 403 if user has study_program-scoped position but no create permission", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const studyProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    await assignStudyProgramPosition({
      userId: user.id,
      studyProgramId: studyProgram.id,
      positionName: "KAPRODI",
    });

    const payload = {
      facultyId: faculty.id,
      code: "SI",
      name: "Sistem Informasi",
      educationalProgramId: educationalProgram.id,
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.message).toBe(
      "Forbidden: You do not have 'create' permission for 'studyProgram_management'",
    );
  });

  it("should return 400 if facultyId is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const payload = { code: "TI", name: "Teknik Informatika" };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should return 400 if code is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const payload = { facultyId: faculty.id, name: "Teknik Informatika" };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const payload = { facultyId: faculty.id, code: "TI" };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should return 400 if facultyId does not exist", async () => {
    const role = await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "studyProgram_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      facultyId: "non-existent-id",
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
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

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Existing Program",
        educationalProgramId: educationalProgram.id,
      },
    });

    const payload = {
      facultyId: faculty.id,
      code: "TI",
      name: "Teknik Informatika",
      educationalProgramId: educationalProgram.id,
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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
});
