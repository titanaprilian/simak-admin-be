import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createLecturerListTestFixtures,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /user-lecturers", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return empty list when no lecturers exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should return lecturers with pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    await createLecturerListTestFixtures(5);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(5);
  });

  it("should filter by studyProgramId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const program1 = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
    });

    const program2 = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "SI", name: "Sistem Informasi" },
    });

    const role = await prisma.role.create({ data: { name: "LecturerRole" } });

    const user1 = await prisma.user.create({
      data: {
        loginId: "dosen1",
        email: "dosen1@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        loginId: "dosen2",
        email: "dosen2@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    await prisma.lecturer.createMany({
      data: [
        {
          userId: user1.id,
          fullName: "Dosen Satu",
          gender: "MALE",
          studyProgramId: program1.id,
        },
        {
          userId: user2.id,
          fullName: "Dosen Dua",
          gender: "MALE",
          studyProgramId: program2.id,
        },
      ],
    });

    const res = await app.handle(
      new Request(
        `http://localhost/user-lecturers?studyProgramId=${program1.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("should filter by search", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    await createLecturerListTestFixtures(2);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers?search=budi", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].fullName).toContain("Budi");
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "read" },
    ]);

    await createLecturerListTestFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    body.data.forEach((lecturer: any) => {
      expect(lecturer).toHaveProperty("id");
      expect(lecturer).toHaveProperty("fullName");
      expect(lecturer).toHaveProperty("gender");
      expect(lecturer).toHaveProperty("studyProgramId");
    });
  });
});
