import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /user-positions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: "test-role-id",
      isActive: true,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: "test",
      positionId: "test-position",
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const fixture = await createTestFixture();

    const payload = {
      loginId: "dosen_new",
      email: "dosen_new@test.com",
      password: "password123",
      roleId: fixture.role.id,
      isActive: true,
      nidn: "654321",
      fullName: "Dr. New",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should create user, lecturer and position assignment successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen123@test.com",
      password: "password123",
      roleId: fixture.role.id,
      isActive: true,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.fullName).toBe("Dr. Budi");
    expect(body.data.user).toBeDefined();
    expect(body.data.user.loginId).toBe("dosen123");
  });

  it("should create with faculty scope position", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createFacultyPositionFixture();

    const payload = {
      loginId: "dosen_faculty",
      email: "dosen_faculty@test.com",
      password: "password123",
      roleId: fixture.role.id,
      isActive: true,
      nidn: "123456",
      fullName: "Dr. Faculty",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      facultyId: fixture.faculty.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.fullName).toBe("Dr. Faculty");
    expect(body.data.user).toBeDefined();
  });

  it("should return 400 if loginId is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const payload = {
      email: "dosen@test.com",
      password: "password123",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if password is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if gender is invalid", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "INVALID",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if studyProgram does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: "non-existent-program-id",
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if position does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: "non-existent-position-id",
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if facultyId is required but not provided for FACULTY scope", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createFacultyPositionFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if single-seat position is already occupied", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "create" },
    ]);

    const fixture = await createTestFixture();

    const role2 = await prisma.role.create({ data: { name: "LecturerRole2" } });

    await prisma.user.create({
      data: {
        loginId: "existing_dosen",
        email: "existing@test.com",
        password: "hashed",
        roleId: role2.id,
      },
    });

    const existingUser = await prisma.user.findFirst({
      where: { loginId: "existing_dosen" },
    });

    await prisma.lecturer.create({
      data: {
        userId: existingUser!.id,
        fullName: "Existing Lecturer",
        gender: "MALE",
        studyProgramId: fixture.program.id,
      },
    });

    await prisma.positionAssignment.create({
      data: {
        userId: existingUser!.id,
        positionId: fixture.position.id,
        studyProgramId: fixture.program.id,
        startDate: new Date(),
        isActive: true,
      },
    });

    const payload = {
      loginId: "new_dosen",
      email: "new_dosen@test.com",
      password: "password123",
      roleId: fixture.role.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: fixture.program.id,
      positionId: fixture.position.id,
      startDate: "2026-01-01",
    };

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });
});

async function createTestFixture() {
  const faculty = await prisma.faculty.create({
    data: { code: "FK_CREATE_TEST", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      code: "TI_CREATE_TEST",
      name: "Teknik Informatika",
    },
  });

  const position = await prisma.position.create({
    data: {
      name: "KAPRODI_CREATE_TEST",
      scopeType: "STUDY_PROGRAM",
      isSingleSeat: true,
    },
  });

  const role = await prisma.role.create({
    data: { name: "LecturerRoleCreateTest" },
  });

  return { faculty, program, position, role };
}

async function createFacultyPositionFixture() {
  const faculty = await prisma.faculty.create({
    data: { code: "FK_CREATE_TEST2", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      code: "TI_CREATE_TEST2",
      name: "Teknik Informatika",
    },
  });

  const position = await prisma.position.create({
    data: {
      name: "DEKAN_CREATE_TEST",
      scopeType: "FACULTY",
      isSingleSeat: true,
    },
  });

  const role = await prisma.role.create({
    data: { name: "LecturerRoleCreateTest2" },
  });

  return { faculty, program, position, role };
}
