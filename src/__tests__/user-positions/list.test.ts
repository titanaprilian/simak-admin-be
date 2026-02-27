import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /user-positions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return empty list when no user-positions exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should return user-positions with pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const fixture = await createUserPositionFixtures(5);

    const res = await app.handle(
      new Request("http://localhost/user-positions?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(5);
  });

  it("should filter by studyProgramId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const program1 = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
    });

    const program2 = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "SI", name: "Sistem Informasi" },
    });

    const position1 = await prisma.position.create({
      data: {
        name: "KAPRODI_TEST_1",
        scopeType: "STUDY_PROGRAM",
        isSingleSeat: true,
      },
    });

    const position2 = await prisma.position.create({
      data: {
        name: "KAPRODI_TEST_2",
        scopeType: "STUDY_PROGRAM",
        isSingleSeat: true,
      },
    });

    const role = await prisma.role.create({ data: { name: "LecturerRole1" } });

    const user1 = await prisma.user.create({
      data: {
        loginId: "dosen1",
        email: "dosen1@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        loginId: "dosen2",
        email: "dosen2@test.com",
        password: "hashed",
        roleId: role.id,
      },
    });

    const lecturer1 = await prisma.lecturer.create({
      data: {
        userId: user1.id,
        fullName: "Dosen Satu",
        gender: "MALE",
        studyProgramId: program1.id,
      },
    });

    const lecturer2 = await prisma.lecturer.create({
      data: {
        userId: user2.id,
        fullName: "Dosen Dua",
        gender: "MALE",
        studyProgramId: program2.id,
      },
    });

    await prisma.positionAssignment.create({
      data: {
        userId: user1.id,
        positionId: position1.id,
        studyProgramId: program1.id,
        startDate: new Date(),
        isActive: true,
      },
    });

    await prisma.positionAssignment.create({
      data: {
        userId: user2.id,
        positionId: position2.id,
        studyProgramId: program2.id,
        startDate: new Date(),
        isActive: true,
      },
    });

    const res = await app.handle(
      new Request(
        `http://localhost/user-positions?studyProgramId=${program1.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].fullName).toBe("Dosen Satu");
  });

  it("should filter by positionId", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const fixture = await createUserPositionFixtures(2);

    const res = await app.handle(
      new Request(
        `http://localhost/user-positions?positionId=${fixture.position.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("should filter by isActive", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const fixture = await createUserPositionFixtures(2);

    await prisma.positionAssignment.update({
      where: { id: fixture.assignment.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request("http://localhost/user-positions?isActive=false", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("should search by fullName", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    await createUserPositionFixtures(2, "Budi");

    const res = await app.handle(
      new Request("http://localhost/user-positions?search=Budi", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "read" },
    ]);

    const fixture = await createUserPositionFixtures(1);

    const res = await app.handle(
      new Request("http://localhost/user-positions", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    body.data.forEach((item: any) => {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("fullName");
      expect(item).toHaveProperty("gender");
      expect(item).toHaveProperty("studyProgramId");
      expect(item).toHaveProperty("user");
      expect(item).toHaveProperty("positionAssignment");
    });
  });
});

async function createUserPositionFixtures(
  count: number,
  namePrefix = "Dr. Budi",
) {
  const faculty = await prisma.faculty.create({
    data: { code: "FK_TEST", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      code: "TI_TEST",
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

  const role = await prisma.role.create({ data: { name: "LecturerRoleTest" } });

  const users = [];
  const lecturers = [];
  const assignments = [];

  for (let i = 0; i < count; i++) {
    const user = await prisma.user.create({
      data: {
        loginId: `dosen_test_${i}`,
        email: `dosen_test_${i}@test.com`,
        password: "hashed",
        roleId: role.id,
      },
    });

    const lecturer = await prisma.lecturer.create({
      data: {
        userId: user.id,
        nidn: `12345${i}`,
        fullName: `${namePrefix} ${i}`,
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

    users.push(user);
    lecturers.push(lecturer);
    assignments.push(assignment);
  }

  return {
    faculty,
    program,
    position,
    role,
    user: users[0],
    lecturer: lecturers[0],
    assignment: assignments[0],
  };
}
