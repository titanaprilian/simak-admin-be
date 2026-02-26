import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  randomIp,
  resetDatabase,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("POST /user-students", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "teststudent",
          email: "teststudent@test.com",
          password: "password123",
          roleId: "role-id",
          name: "Test Student",
          generation: 2022,
          gender: "male",
          yearOfEntry: 2022,
          birthYear: 2004,
          studyProgramId: "program-id",
        }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "teststudent",
          email: "teststudent@test.com",
          password: "password123",
          roleId: "role-id",
          name: "Test Student",
          generation: 2022,
          gender: "male",
          yearOfEntry: 2022,
          birthYear: 2004,
          studyProgramId: "program-id",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 400 if required field is missing", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "teststudent",
          email: "teststudent@test.com",
          password: "password123",
          roleId: "role-id",
          name: "Test Student",
          generation: 2022,
          gender: "male",
          yearOfEntry: 2022,
          birthYear: 2004,
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 if login ID already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program } = await createStudentTestFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "mahasiswa0",
          email: "newstudent@test.com",
          password: "password123",
          roleId: "role-id",
          name: "New Student",
          generation: 2022,
          gender: "male",
          yearOfEntry: 2022,
          birthYear: 2004,
          studyProgramId: program.id,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should create a new student successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program } = await createStudentTestFixtures(0);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "newstudent",
          email: "newstudent@test.com",
          password: "password123",
          roleId: role.id,
          name: "New Student",
          generation: 2022,
          gender: "male",
          yearOfEntry: 2022,
          birthYear: 2004,
          address: "Jl. Test No. 1",
          statusMhs: "belum_program",
          kelas: "A",
          jenis: "reguler",
          cityBirth: "Jakarta",
          phoneNumber: "081234567890",
          semester: 1,
          studyProgramId: program.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.nim).toBe("newstudent");
    expect(body.data.email).toBe("newstudent@test.com");
    expect(body.data.name).toBe("New Student");
    expect(body.data.generation).toBe(2022);
    expect(body.data.gender).toBe("male");
    expect(body.data.yearOfEntry).toBe(2022);
    expect(body.data.birthYear).toBe(2004);
    expect(body.data.address).toBe("Jl. Test No. 1");
    expect(body.data.statusMhs).toBe("belum_program");
    expect(body.data.kelas).toBe("A");
    expect(body.data.jenis).toBe("reguler");
    expect(body.data.cityBirth).toBe("Jakarta");
    expect(body.data.phoneNumber).toBe("081234567890");
    expect(body.data.semester).toBe(1);
    expect(body.data.studyProgram).toBeDefined();
    expect(body.data.studyProgram.name).toBe("Teknik Informatika");
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program } = await createStudentTestFixtures(0);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          loginId: "newstudent",
          email: "newstudent@test.com",
          password: "password123",
          roleId: role.id,
          name: "New Student",
          generation: 2022,
          gender: "male",
          yearOfEntry: 2022,
          birthYear: 2004,
          studyProgramId: program.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.message).toBe("Estudiante creado exitosamente");
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
