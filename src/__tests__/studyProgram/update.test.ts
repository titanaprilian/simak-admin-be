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

describe("PATCH /study-programs/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/study-programs/some-id", {
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
      new Request("http://localhost/study-programs/some-id", {
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

  it("should update study program successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
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

    const program = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Komputer" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Teknik Komputer");
  });

  it("should return 403 if user has update permission but no faculty scope", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const program = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Komputer" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 if study program not found", async () => {
    const role = await createTestRoleWithPermissions("SuperAdmin", [
      { featureName: "studyProgram_management", action: "update" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/study-programs/non-existent-id", {
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
      { featureName: "studyProgram_management", action: "update" },
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

    await prisma.studyProgram.createMany({
      data: [
        {
          facultyId: faculty.id,
          code: "TI",
          name: "Teknik Informatika",
          educationalProgramId: educationalProgram.id,
        },
        {
          facultyId: faculty.id,
          code: "SI",
          name: "Sistem Informasi",
          educationalProgramId: educationalProgram.id,
        },
      ],
    });

    const program = await prisma.studyProgram.findFirst({
      where: { code: "TI" },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ code: "SI" }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should allow update when user has STUDY_PROGRAM scoped position on same program", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
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

    const program = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    await assignStudyProgramPosition({
      userId: user.id,
      studyProgramId: program.id,
      positionName: "KAPRODI",
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Komputer" }),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should return 403 when user has STUDY_PROGRAM scope on different program", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
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

    const ownedProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "SI",
        name: "Sistem Informasi",
        educationalProgramId: educationalProgram.id,
      },
    });

    const targetProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    await assignStudyProgramPosition({
      userId: user.id,
      studyProgramId: ownedProgram.id,
      positionName: "KAPRODI",
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${targetProgram.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Komputer" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user has faculty scope but study program is not in that faculty", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

    const facultyWithScope = await prisma.faculty.create({
      data: { code: "FK1", name: "Fakultas Teknik" },
    });

    const facultyWithoutScope = await prisma.faculty.create({
      data: { code: "FK2", name: "Fakultas Ekonomi" },
    });

    await assignFacultyPosition({
      userId: user.id,
      facultyId: facultyWithScope.id,
      positionName: "DEKAN",
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const targetProgram = await prisma.studyProgram.create({
      data: {
        facultyId: facultyWithoutScope.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${targetProgram.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Komputer" }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.message).toBe("Forbidden");
  });
});
