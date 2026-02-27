import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /user-positions/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-positions/some-id", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-positions/some-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when user-position not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-positions/non-existent-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return user-position when found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(fixture.lecturer.id);
    expect(body.data.fullName).toBe("Dr. Budi");
    expect(body.data.user).toBeDefined();
    expect(body.data.user.loginId).toBe("dosen_test");
    expect(body.data.positionAssignment).toBeDefined();
    expect(body.data.positionAssignment.position.name).toBe("KAPRODI_TEST");
  });

  it("should return user-position with faculty scope position", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK_TEST", name: "Fakultas Teknik" },
    });

    const position = await prisma.position.create({
      data: { name: "DEKAN_TEST", scopeType: "FACULTY", isSingleSeat: true },
    });

    const role = await prisma.role.create({
      data: { name: "LecturerRoleTest2" },
    });

    const user = await prisma.user.create({
      data: {
        loginId: "dosen_faculty",
        email: "dosen_faculty@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const program = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI_TEST2",
        name: "Teknik Informatika",
      },
    });

    const lecturer = await prisma.lecturer.create({
      data: {
        userId: user.id,
        nidn: "999999",
        fullName: "Dr. Faculty",
        gender: "MALE",
        studyProgramId: program.id,
      },
    });

    await prisma.lecturer.update({
      where: { id: lecturer.id },
      data: { studyProgramId: program.id },
    });

    await prisma.positionAssignment.create({
      data: {
        userId: user.id,
        positionId: position.id,
        facultyId: faculty.id,
        startDate: new Date(),
        isActive: true,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${lecturer.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.positionAssignment.position.scopeType).toBe("FACULTY");
    expect(body.data.positionAssignment.faculty).toBeDefined();
  });
});

async function createUserPositionFixture() {
  const faculty = await prisma.faculty.create({
    data: { code: "FK_GET_TEST", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      code: "TI_GET_TEST",
      name: "Teknik Informatika",
    },
  });

  const position = await prisma.position.create({
    data: {
      name: "KAPRODI_TEST",
      scopeType: "STUDY_PROGRAM",
      isSingleSeat: true,
    },
  });

  const role = await prisma.role.create({
    data: { name: "LecturerRoleGetTest" },
  });

  const user = await prisma.user.create({
    data: {
      loginId: "dosen_test",
      email: "dosen_test@test.com",
      password: "hashed",
      roleId: role.id,
    },
  });

  const lecturer = await prisma.lecturer.create({
    data: {
      userId: user.id,
      nidn: "12345",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    },
  });

  const assignment = await prisma.positionAssignment.create({
    data: {
      userId: user.id,
      positionId: position.id,
      studyProgramId: program.id,
      startDate: new Date(),
      isActive: true,
    },
  });

  return {
    faculty,
    program,
    position,
    role,
    user,
    lecturer,
    assignment,
  };
}
