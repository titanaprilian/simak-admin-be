import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  randomIp,
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("PATCH /user-students/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 400 if body is empty", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students/some-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 404 if student not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should update student successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Name",
          generation: 2023,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated Name");
    expect(body.data.generation).toBe(2023);
    expect(body.data).toHaveProperty("id");
  });

  it("should update isActive status", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(false);
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const { student } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Estudiante actualizado exitosamente");
  });

  it("should return 404 with Spanish message when student not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
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
