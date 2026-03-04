import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /user-students", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return empty list when no students exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should return students with pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    const { student } = await createStudentTestFixtures(5);

    const res = await app.handle(
      new Request("http://localhost/user-students?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(5);
  });

  it("should include studyProgram relation", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].studyProgram).toBeDefined();
    expect(body.data[0].studyProgram.name).toBe("Teknik Informatika");
  });

  it("should include loginId as nim", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].nim).toBeDefined();
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    body.data.forEach((student: Record<string, unknown>) => {
      expect(student).toHaveProperty("id");
      expect(student).toHaveProperty("nim");
      expect(student).toHaveProperty("email");
      expect(student).toHaveProperty("isActive");
      expect(student).toHaveProperty("name");
      expect(student).toHaveProperty("gender");
      expect(student).toHaveProperty("birthYear");
      expect(student).toHaveProperty("jenis");
      expect(student).toHaveProperty("studyProgram");
      expect(student).toHaveProperty("academicClass");
      expect(student).toHaveProperty("enrollmentTerm");
    });
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Estudiantes recuperados exitosamente");
  });

  it("should filter by studyProgramId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana", level: "S1" },
    });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const program1 = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        educationalProgramId: educationalProgram.id,
        code: "TI",
        name: "Teknik Informatika",
      },
    });

    const program2 = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        educationalProgramId: educationalProgram.id,
        code: "SI",
        name: "Sistem Informasi",
      },
    });

    const academicTerm = await prisma.academicTerm.create({
      data: {
        academicYear: "2024/2025",
        termType: "GANJIL",
        termOrder: 1,
        startDate: new Date("2024-08-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      },
    });

    const academicClass1 = await prisma.academicClass.create({
      data: {
        name: "FKTI-2022-A",
        studyProgramId: program1.id,
        enrollmentYear: 2022,
        capacity: 30,
      },
    });

    const academicClass2 = await prisma.academicClass.create({
      data: {
        name: "FKSY-2022-A",
        studyProgramId: program2.id,
        enrollmentYear: 2022,
        capacity: 30,
      },
    });

    const role = await prisma.role.create({ data: { name: "StudentRole" } });

    const user1 = await prisma.user.create({
      data: {
        loginId: "mahasiswa1",
        email: "mahasiswa1@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        loginId: "mahasiswa2",
        email: "mahasiswa2@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    await prisma.student.createMany({
      data: [
        {
          userId: user1.id,
          name: "Mahasiswa Satu",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program1.id,
          academicClassId: academicClass1.id,
          enrollmentTermId: academicTerm.id,
        },
        {
          userId: user2.id,
          name: "Mahasiswa Dua",
          gender: "female",
          birthYear: 2004,
          studyProgramId: program2.id,
          academicClassId: academicClass2.id,
          enrollmentTermId: academicTerm.id,
        },
      ],
    });

    const res = await app.handle(
      new Request(
        `http://localhost/user-students?studyProgramId=${program1.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

async function createStudentTestFixtures(count: number) {
  const educationalProgram = await prisma.educationalProgram.create({
    data: { name: "Sarjana", level: "S1" },
  });

  const faculty = await prisma.faculty.create({
    data: { code: "FK", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      educationalProgramId: educationalProgram.id,
      code: "TI",
      name: "Teknik Informatika",
    },
  });

  const academicTerm = await prisma.academicTerm.create({
    data: {
      academicYear: "2024/2025",
      termType: "GANJIL",
      termOrder: 1,
      startDate: new Date("2024-08-01"),
      endDate: new Date("2024-12-31"),
      isActive: true,
    },
  });

  const academicClass = await prisma.academicClass.create({
    data: {
      name: "FKTI-2022-A",
      studyProgramId: program.id,
      enrollmentYear: 2022,
      capacity: 30,
    },
  });

  const role = await prisma.role.create({ data: { name: "StudentRole" } });

  const students = [];
  for (let i = 0; i < count; i++) {
    const user = await prisma.user.create({
      data: {
        loginId: `mahasiswa${i}`,
        email: `mahasiswa${i}@test.com`,
        password: "hashed",
        roleId: role.id,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        name: `Mahasiswa ${i}`,
        gender: "male",
        birthYear: 2004,
        studyProgramId: program.id,
        academicClassId: academicClass.id,
        enrollmentTermId: academicTerm.id,
      },
    });

    students.push(student);
  }

  return {
    student: students[0],
    program,
    faculty,
    academicClass,
    academicTerm,
  };
}
