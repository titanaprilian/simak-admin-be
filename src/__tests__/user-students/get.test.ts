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

  it("should return student by id successfully", async () => {
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

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(student.id);
    expect(body.data.nim).toBeDefined();
    expect(body.data.email).toBeDefined();
    expect(body.data.name).toBeDefined();
    expect(body.data.generation).toBeDefined();
    expect(body.data.studyProgram).toBeDefined();
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
  const faculty = await prisma.faculty.create({
    data: { code: "FK", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
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
        generation: 2022,
        gender: "male",
        yearOfEntry: 2022,
        birthYear: 2004,
        studyProgramId: program.id,
      },
    });

    students.push(student);
  }

  return { student: students[0], program, faculty };
}
