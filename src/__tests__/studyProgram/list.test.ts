import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /study-programs", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/study-programs", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return empty list when no study programs exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should return study programs with pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
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
        {
          facultyId: faculty.id,
          code: "TK",
          name: "Teknik Komputer",
          educationalProgramId: educationalProgram.id,
        },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(3);
    expect(body.data[0].educationalProgramId).toBe(educationalProgram.id);
  });

  it("should filter by facultyId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty1 = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const faculty2 = await prisma.faculty.create({
      data: { code: "FKM", name: "Fakultas Kedokteran" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    await prisma.studyProgram.createMany({
      data: [
        {
          facultyId: faculty1.id,
          code: "TI",
          name: "Teknik Informatika",
          educationalProgramId: educationalProgram.id,
        },
        {
          facultyId: faculty2.id,
          code: "KD",
          name: "Kedokteran",
          educationalProgramId: educationalProgram.id,
        },
      ],
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs?facultyId=${faculty1.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe("TI");
  });

  it("should filter by search", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
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

    const res = await app.handle(
      new Request("http://localhost/study-programs?search=informasi", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toContain("Informasi");
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    body.data.forEach((program: any) => {
      expect(program).toHaveProperty("id");
      expect(program).toHaveProperty("code");
      expect(program).toHaveProperty("name");
      expect(program).toHaveProperty("facultyId");
    });
  });
});
