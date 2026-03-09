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
          loginId: "0001",
          email: "teststudent@test.com",
          password: "password123",
          roleId: "role-id",
          name: "Test Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: "program-id",
          academicClassId: "class-id",
          enrollmentTermId: "term-id",
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
          loginId: "0001",
          email: "teststudent@test.com",
          password: "password123",
          roleId: "role-id",
          name: "Test Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: "program-id",
          academicClassId: "class-id",
          enrollmentTermId: "term-id",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 400 if required field is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
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
          loginId: "0001",
          email: "teststudent@test.com",
          password: "password123",
          name: "Test Student",
          gender: "male",
          birthYear: 2004,
          // missing studyProgramId, academicClassId, enrollmentTermId
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

    const { program, academicClass, academicTerm } =
      await createStudentTestFixtures(0);

    // Pre-seed a user with the full constructed loginId: "24" + "FK" + "TI" + "0001"
    const existingRole = await prisma.role.create({
      data: { name: "ExistingRole" },
    });
    await prisma.user.create({
      data: {
        loginId: "24FKTI0001",
        email: "existing@test.com",
        password: "hashed",
        roleId: existingRole.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "0001", // suffix only — constructs to "24FKTI0001"
          email: "newstudent@test.com",
          password: "password123",
          name: "New Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program.id,
          academicClassId: academicClass.id,
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should create a new student successfully with provided loginId suffix", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program, academicClass, academicTerm } =
      await createStudentTestFixtures(0);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "0001", // suffix only — constructs to "24FKTI0001"
          email: "newstudent@test.com",
          password: "password123",
          roleId: role.id,
          name: "New Student",
          gender: "male",
          birthYear: 2004,
          address: "Jl. Test No. 1",
          jenis: "reguler",
          cityBirth: "Jakarta",
          phoneNumber: "081234567890",
          studyProgramId: program.id,
          academicClassId: academicClass.id,
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.nim).toBe("24FKTI0001"); // yearPrefix=24, facultyCode=FK, programCode=TI, suffix=0001
    expect(body.data.email).toBe("newstudent@test.com");
    expect(body.data.name).toBe("New Student");
    expect(body.data.gender).toBe("male");
    expect(body.data.birthYear).toBe(2004);
    expect(body.data.address).toBe("Jl. Test No. 1");
    expect(body.data.jenis).toBe("reguler");
    expect(body.data.cityBirth).toBe("Jakarta");
    expect(body.data.phoneNumber).toBe("081234567890");
    expect(body.data.studyProgram).toBeDefined();
    expect(body.data.studyProgram.name).toBe("Teknik Informatika");
    expect(body.data.academicClass).toBeDefined();
    expect(body.data.academicClass.name).toBe("FKTI-2024-A");
    expect(body.data.enrollmentTerm).toBeDefined();
    expect(body.data.enrollmentTerm.academicYear).toBe("2024/2025");
  });

  it("should create student without loginId and auto-assign Mahasiswa role", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program, academicClass, academicTerm } =
      await createStudentTestFixtures(0);

    await prisma.role.create({
      data: { name: "Mahasiswa" },
    });

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "autostudent@test.com",
          password: "password123",
          name: "Auto Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program.id,
          academicClassId: academicClass.id,
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.nim).toBeDefined();
    expect(body.data.nim).toMatch(/^24FKTI[0-9]{4}$/);
  });

  it("should return 409 when constructed loginId already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program, academicClass, academicTerm } =
      await createStudentTestFixtures(0);

    const existingRole = await prisma.role.create({
      data: { name: "ExistingRole" },
    });

    // Pre-seed the full constructed loginId
    await prisma.user.create({
      data: {
        loginId: "24FKTI0001",
        email: "existing@test.com",
        password: "hashed",
        roleId: existingRole.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          loginId: "0001", // constructs to "24FKTI0001" — already taken
          email: "newstudent@test.com",
          password: "password123",
          name: "New Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program.id,
          academicClassId: academicClass.id,
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program, academicClass, academicTerm } =
      await createStudentTestFixtures(0);

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          loginId: "0001",
          email: "newstudent@test.com",
          password: "password123",
          roleId: role.id,
          name: "New Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program.id,
          academicClassId: academicClass.id,
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.message).toBe("Estudiante creado exitosamente");
  });

  it("should auto-assign existing class when academicClassId is not provided", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    const { program, academicClass, academicTerm } =
      await createStudentTestFixtures(0);

    await prisma.role.create({ data: { name: "Mahasiswa" } });

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "autostudent@test.com",
          password: "password123",
          name: "Auto Class Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program.id,
          // no academicClassId provided
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.academicClass).toBeDefined();
    expect(body.data.academicClass.id).toBe(academicClass.id); // should assign the existing class
    expect(body.data.academicClass.name).toBe("FKTI-2024-A");
  });

  it("should auto-create and assign a new class when no class exists for the study program and enrollment year", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "student_management", action: "create" },
    ]);

    // Use fixtures but don't create any academicClass for the matching enrollmentYear
    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana", level: "S1" },
    });
    const faculty = await prisma.faculty.create({
      data: { code: "FT", name: "Fakultas Teknologi" },
    });
    const program = await prisma.studyProgram.create({
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
        termType: "GENAP",
        termOrder: 2,
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-06-30"),
        isActive: false,
      },
    });
    // No academicClass created for this program + enrollmentYear (2024)

    await prisma.role.create({ data: { name: "Mahasiswa" } });

    const res = await app.handle(
      new Request("http://localhost/user-students", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "newclassstudent@test.com",
          password: "password123",
          name: "New Class Student",
          gender: "male",
          birthYear: 2004,
          studyProgramId: program.id,
          // no academicClassId — should trigger auto-create
          enrollmentTermId: academicTerm.id,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.academicClass).toBeDefined();
    expect(body.data.academicClass.name).toBe("FTSI-2024-A"); // {FT}{SI}-{2024}-{A}

    // Verify the class was actually persisted in the DB
    const createdClass = await prisma.academicClass.findFirst({
      where: { studyProgramId: program.id, enrollmentYear: 2024 },
    });
    expect(createdClass).not.toBeNull();
    expect(createdClass!.name).toBe("FTSI-2024-A");
    expect(createdClass!.capacity).toBe(30);
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
      name: "FKTI-2024-A",
      studyProgramId: program.id,
      enrollmentYear: 2024,
      capacity: 30,
    },
  });

  const role = await prisma.role.create({ data: { name: "StudentRole" } });

  const students = [];
  for (let i = 0; i < count; i++) {
    const user = await prisma.user.create({
      data: {
        loginId: `24FKTI000${i}`,
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
