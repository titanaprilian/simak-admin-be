import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /study-programs/options", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no studyProgram_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has studyProgram_management create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 200 and list of study program options", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.createMany({
      data: [
        { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
        { facultyId: faculty.id, code: "SI", name: "Sistem Informasi" },
        { facultyId: faculty.id, code: "TE", name: "Teknik Elektro" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(3);
  });

  it("should return only id, name, and code fields", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        description: "Test description",
      },
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("name");
    expect(body.data[0]).toHaveProperty("code");
    expect(body.data[0]).not.toHaveProperty("description");
    expect(body.data[0]).not.toHaveProperty("facultyId");
    expect(body.data[0]).not.toHaveProperty("createdAt");
    expect(body.data[0]).not.toHaveProperty("updatedAt");
  });

  it("should return empty list when no study programs exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("should filter study programs by search", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.createMany({
      data: [
        { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
        { facultyId: faculty.id, code: "SI", name: "Sistem Informasi" },
        { facultyId: faculty.id, code: "TE", name: "Teknik Elektro" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs/options?search=informasi", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Sistem Informasi");
  });

  it("should filter study programs by facultyId", async () => {
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

    await prisma.studyProgram.createMany({
      data: [
        { facultyId: faculty1.id, code: "TI", name: "Teknik Informatika" },
        { facultyId: faculty1.id, code: "SI", name: "Sistem Informasi" },
        { facultyId: faculty2.id, code: "KD", name: "Kedokteran" },
      ],
    });

    const res = await app.handle(
      new Request(
        `http://localhost/study-programs/options?facultyId=${faculty1.id}`,
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
    expect(body.data).toHaveLength(2);
    expect(
      body.data.every(
        (sp: { facultyId: string }) => sp.facultyId === undefined,
      ),
    ).toBe(true);
  });

  it("should return correct pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.createMany({
      data: [
        { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
        { facultyId: faculty.id, code: "SI", name: "Sistem Informasi" },
        { facultyId: faculty.id, code: "TE", name: "Teknik Elektro" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs/options?page=1&limit=2", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs/options?page=0", {
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
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs/options?limit=999", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return sorted study programs by name ascending", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.createMany({
      data: [
        { facultyId: faculty.id, code: "TZ", name: "Teknik Zeta" },
        { facultyId: faculty.id, code: "TA", name: "Teknik Alpha" },
        { facultyId: faculty.id, code: "TM", name: "Teknik Mu" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/study-programs/options", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.map((sp: { name: string }) => sp.name)).toEqual([
      "Teknik Alpha",
      "Teknik Mu",
      "Teknik Zeta",
    ]);
  });
});
