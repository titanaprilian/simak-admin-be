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

  it("should update student name successfully", async () => {
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
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated Name");
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

  it("should update loginId using suffix and existing program prefix", async () => {
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
          loginId: "0099", // constructs to "24FKTI0099"
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nim).toBe("24FKTI0099");
  });

  it("should not update studyProgramId even if provided in the request body", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const { student, program, educationalProgram } =
      await createStudentTestFixtures(1);

    const newFaculty = await prisma.faculty.create({
      data: { code: "EK", name: "Fakultas Ekonomi" },
    });
    const newProgram = await prisma.studyProgram.create({
      data: {
        facultyId: newFaculty.id,
        educationalProgramId: educationalProgram.id,
        code: "AK",
        name: "Akuntansi",
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Name",
          studyProgramId: newProgram.id, // should be ignored
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated Name"); // normal fields still update
    expect(body.data.studyProgram.id).toBe(program.id); // still the original program
    expect(body.data.studyProgram.name).not.toBe("Akuntansi"); // new program was NOT applied
  });

  it("should return 409 when updated loginId conflicts with existing user", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const { student, program, academicTerm } =
      await createStudentTestFixtures(1);

    // Pre-seed a user that already owns the target constructed loginId
    const conflictRole = await prisma.role.create({
      data: { name: "ConflictRole" },
    });
    await prisma.user.create({
      data: {
        loginId: "24FKTI0099",
        email: "conflict@test.com",
        password: "hashed",
        roleId: conflictRole.id,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "0099", // constructs to "24FKTI0099" — already taken
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should not return 409 when loginId suffix resolves to the same current loginId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "update" },
    ]);

    const { student } = await createStudentTestFixtures(1);
    // Fixture seeds loginId as "24FKTI0000" for index 0
    const res = await app.handle(
      new Request(`http://localhost/user-students/${student.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "0000", // constructs to "24FKTI0000" — same as current, should not conflict
          name: "Updated Name",
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nim).toBe("24FKTI0000");
    expect(body.data.name).toBe("Updated Name");
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
        loginId: `24FKTI000${i}`, // constructed format: yearPrefix=24, facultyCode=FK, programCode=TI
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
    educationalProgram,
  };
}
