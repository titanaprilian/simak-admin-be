import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /user-lecturers/options", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no lecturer_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has lecturer_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 200 and list of lecturer options", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

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

    await prisma.lecturer.create({
      data: {
        userId: user.id,
        fullName: "Dr. John Doe",
        nidn: "1234567890",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should return only id, nidn, and fullName fields", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

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

    await prisma.lecturer.create({
      data: {
        userId: user.id,
        fullName: "Dr. John Doe",
        nidn: "1234567890",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const lecturer = body.data[0];
    expect(lecturer).toHaveProperty("id");
    expect(lecturer).toHaveProperty("nidn");
    expect(lecturer).toHaveProperty("fullName");
    expect(lecturer).not.toHaveProperty("gender");
    expect(lecturer).not.toHaveProperty("studyProgramId");
    expect(lecturer).not.toHaveProperty("createdAt");
  });

  it("should filter lecturers by search on fullName", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

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

    await prisma.lecturer.create({
      data: {
        userId: user.id,
        fullName: "Dr. John Doe",
        nidn: "1234567890",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    const res = await app.handle(
      new Request(
        "http://localhost/user-lecturers/options?search=nonexistent",
        {
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("should filter lecturers by search on nidn", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

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

    await prisma.lecturer.create({
      data: {
        userId: user.id,
        fullName: "Dr. John Doe",
        nidn: "1234567890",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options?search=1234567890", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].nidn).toBe("1234567890");
  });

  it("should return correct pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

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

    const user1 = await prisma.user.create({
      data: {
        email: "user1@test.com",
        loginId: "user1",
        password: "password123",
        roleId: (await prisma.role.findFirst())!.id,
      },
    });

    await prisma.lecturer.create({
      data: {
        userId: user1.id,
        fullName: "Dr. User One",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options?page=1&limit=10", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options?page=0", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if limit exceeds maximum", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options?limit=999", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return sorted lecturers by fullName ascending", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

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

    const user1 = await prisma.user.create({
      data: {
        email: "user1@test.com",
        loginId: "user1",
        password: "password123",
        roleId: (await prisma.role.findFirst())!.id,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: "user2@test.com",
        loginId: "user2",
        password: "password123",
        roleId: (await prisma.role.findFirst())!.id,
      },
    });

    await prisma.lecturer.createMany({
      data: [
        {
          userId: user1.id,
          fullName: "Charlie",
          gender: "male",
          studyProgramId: studyProgram.id,
        },
        {
          userId: user2.id,
          fullName: "Alice",
          gender: "female",
          studyProgramId: studyProgram.id,
        },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/user-lecturers/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    const fullNames = body.data.map((l: { fullName: string }) => l.fullName);
    const sortedFullNames = [...fullNames].sort();
    expect(fullNames).toEqual(sortedFullNames);
  });
});
