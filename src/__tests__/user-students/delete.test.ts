import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  randomIp,
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("DELETE /user-students/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "DELETE",
        headers: {
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 if student not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students/non-existent-id", {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 403 if user tries to delete themselves", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "delete" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    await prisma.student.update({
      where: { id: student.id },
      data: { userId: user.id },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete student successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "delete" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeNull();

    const deletedStudent = await prisma.student.findUnique({
      where: { id: student.id },
    });
    expect(deletedStudent).toBeNull();
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "delete" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Estudiante eliminado exitosamente");
  });

  it("should return 404 with Spanish message when student not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.message).toBe("Estudiante no encontrado");
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
