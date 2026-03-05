import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /academic-classes/options - Get Academic Class Options", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const seedAcademicClasses = async () => {
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

    await prisma.academicClass.createMany({
      data: [
        {
          name: "FKTI-2023-A",
          studyProgramId: studyProgram.id,
          enrollmentYear: 2023,
        },
        {
          name: "FKTI-2023-B",
          studyProgramId: studyProgram.id,
          enrollmentYear: 2023,
        },
        {
          name: "FKTI-2024-A",
          studyProgramId: studyProgram.id,
          enrollmentYear: 2024,
        },
      ],
    });

    return { faculty, educationalProgram, studyProgram };
  };

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/academic-classes/options", {
        method: "GET",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const res = await app.handle(
      new Request("http://localhost/academic-classes/options", {
        method: "GET",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("should return list of options with id and name", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    await seedAcademicClasses();

    const res = await app.handle(
      new Request("http://localhost/academic-classes/options", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);

    const firstClass = body.data[0];
    expect(firstClass).toHaveProperty("id");
    expect(firstClass).toHaveProperty("name");
    expect(firstClass).not.toHaveProperty("studyProgramId");
    expect(firstClass).not.toHaveProperty("enrollmentYear");
    expect(firstClass).not.toHaveProperty("capacity");
  });

  it("should filter options by search query", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    await seedAcademicClasses();

    const res = await app.handle(
      new Request("http://localhost/academic-classes/options?search=2023", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data.every((c: any) => c.name.includes("2023"))).toBe(true);
  });

  it("should filter options by studyProgramId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    const { studyProgram } = await seedAcademicClasses();

    const res = await app.handle(
      new Request(
        `http://localhost/academic-classes/options?studyProgramId=${studyProgram.id}`,
        {
          method: "GET",
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);
  });

  it("should filter options by enrollmentYear", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    await seedAcademicClasses();

    const res = await app.handle(
      new Request(
        "http://localhost/academic-classes/options?enrollmentYear=2023",
        {
          method: "GET",
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.every((c: any) => c.name.includes("2023"))).toBe(true);
  });

  it("should respect pagination parameters", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    await seedAcademicClasses();

    const res = await app.handle(
      new Request("http://localhost/academic-classes/options?page=1&limit=2", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
  });

  it("should return Indonesian success message for options", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    await seedAcademicClasses();

    const res = await app.handle(
      new Request("http://localhost/academic-classes/options", {
        method: "GET",
        headers: {
          ...authHeaders,
          "Accept-Language": "id",
        },
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Opsi kelas akademik berhasil diambil");
  });
});
