import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /academic-classes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
        method: "GET",
        headers: {
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return paginated academic classes", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

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
        { name: "A", studyProgramId: studyProgram.id, enrollmentYear: 2023 },
        { name: "B", studyProgramId: studyProgram.id, enrollmentYear: 2023 },
        { name: "C", studyProgramId: studyProgram.id, enrollmentYear: 2023 },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/academic-classes?page=1&limit=2", {
        method: "GET",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
  });

  it("should include studyProgram and advisorLecturer relations", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "read" },
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

    const lecturer = await prisma.lecturer.create({
      data: {
        userId: user.id,
        fullName: "Dr. John Doe",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    await prisma.academicClass.create({
      data: {
        name: "A",
        studyProgramId: studyProgram.id,
        enrollmentYear: 2023,
        advisorLecturerId: lecturer.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
        method: "GET",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data[0].studyProgram).toBeDefined();
    expect(body.data[0].studyProgram.code).toBe("TI");
    expect(body.data[0].advisorLecturer).toBeDefined();
    expect(body.data[0].advisorLecturer.fullName).toBe("Dr. John Doe");
  });

  it("should filter by studyProgramId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const studyProgram1 = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const studyProgram2 = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "SI",
        name: "Sistem Informasi",
        educationalProgramId: educationalProgram.id,
      },
    });

    await prisma.academicClass.createMany({
      data: [
        { name: "A", studyProgramId: studyProgram1.id, enrollmentYear: 2023 },
        { name: "B", studyProgramId: studyProgram2.id, enrollmentYear: 2023 },
      ],
    });

    const res = await app.handle(
      new Request(
        `http://localhost/academic-classes?studyProgramId=${studyProgram1.id}`,
        {
          method: "GET",
          headers: {
            ...authHeaders,
            "x-forwarded-for": randomIp(),
          },
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].studyProgramId).toBe(studyProgram1.id);
  });

  it("should filter by enrollmentYear", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

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
        { name: "A", studyProgramId: studyProgram.id, enrollmentYear: 2023 },
        { name: "B", studyProgramId: studyProgram.id, enrollmentYear: 2024 },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/academic-classes?enrollmentYear=2023", {
        method: "GET",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].enrollmentYear).toBe(2023);
  });

  it("should search by name", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

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
          name: "Kelas A",
          studyProgramId: studyProgram.id,
          enrollmentYear: 2023,
        },
        {
          name: "Kelas B",
          studyProgramId: studyProgram.id,
          enrollmentYear: 2023,
        },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/academic-classes?search=Kelas A", {
        method: "GET",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("Kelas A");
  });
});
