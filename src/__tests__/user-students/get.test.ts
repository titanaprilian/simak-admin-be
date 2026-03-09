import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  randomIp,
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("GET /user-students/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "GET",
        headers: {
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 if student not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students/non-existent-id", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it.only("should return student by id successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    console.log(body);

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(student.id);
    expect(body.data.nim).toBeDefined();
    expect(body.data.email).toBeDefined();
    expect(body.data.name).toBeDefined();
    expect(body.data.studyProgram).toBeDefined();
    expect(body.data.faculty).toBeDefined();
    expect(body.data.semester).toBeDefined();
    expect(body.data.academicClass).toBeDefined();
    expect(body.data.enrollmentTerm).toBeDefined();
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "read" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Estudiante recuperado exitosamente");
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
