import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
  createPositionTestFixture,
  createPositionAssignment,
} from "../../test_utils";

describe("GET /positions/assignments", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should list assignments with read permission", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments?page=1&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it("should filter assignments by userId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const user2Role = await prisma.role.create({ data: { name: "User2Role" } });
    const user2 = await prisma.user.create({
      data: {
        loginId: "user2-assignment",
        email: "user2-assignment@test.com",
        password: "hashed",
        roleId: user2Role.id,
      },
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    await createPositionAssignment({
      userId: user2.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(
        `http://localhost/positions/assignments?page=1&limit=10&userId=${user.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].user.id).toBe(user.id);
  });

  it("should filter assignments by positionId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition, studyProgramPosition } =
      await createPositionTestFixture();

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: studyProgramPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(
        `http://localhost/positions/assignments?page=1&limit=10&positionId=${facultyPosition.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].position.name).toBe(facultyPosition.name);
  });

  it("should filter assignments by facultyId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { facultyPosition } = await createPositionTestFixture();

    const faculty1 = await prisma.faculty.create({
      data: { code: "FK1", name: "Fakultas Teknik" },
    });
    const faculty2 = await prisma.faculty.create({
      data: { code: "FH", name: "Fakultas Hukum" },
    });

    const userRole = await prisma.role.create({ data: { name: "UserRole" } });
    const user = await prisma.user.create({
      data: {
        loginId: "test-user-faculty",
        email: "test-user-faculty@test.com",
        password: "hashed",
        roleId: userRole.id,
      },
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty1.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty2.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(
        `http://localhost/positions/assignments?page=1&limit=10&facultyId=${faculty1.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].faculty.code).toBe("FK1");
  });

  it("should filter assignments by studyProgramId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { studyProgram, studyProgramPosition } =
      await createPositionTestFixture();

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const studyProgram1 = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI1",
        name: "Teknik Informatika 1",
      },
    });
    const studyProgram2 = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "SI",
        name: "Sistem Informasi",
      },
    });

    const userRole = await prisma.role.create({ data: { name: "UserRoleSP" } });
    const user = await prisma.user.create({
      data: {
        loginId: "test-user-sp",
        email: "test-user-sp@test.com",
        password: "hashed",
        roleId: userRole.id,
      },
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: studyProgramPosition.id,
      studyProgramId: studyProgram1.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: studyProgramPosition.id,
      studyProgramId: studyProgram2.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request(
        `http://localhost/positions/assignments?page=1&limit=10&studyProgramId=${studyProgram1.id}`,
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].studyProgram.code).toBe("TI1");
  });

  it("should filter assignments by isActive", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2025-01-01",
      isActive: false,
    });

    const res = await app.handle(
      new Request(
        "http://localhost/positions/assignments?page=1&limit=10&isActive=true",
        {
          headers: authHeaders,
        },
      ),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].isActive).toBe(true);
  });

  it("should paginate assignments", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, facultyPosition } = await createPositionTestFixture();

    for (let i = 0; i < 5; i++) {
      const userRole = await prisma.role.create({
        data: { name: `UserRole${i}` },
      });
      const user = await prisma.user.create({
        data: {
          loginId: `user${i}pagination`,
          email: `user${i}pagination@test.com`,
          password: "hashed",
          roleId: userRole.id,
        },
      });

      await createPositionAssignment({
        userId: user.id,
        positionId: facultyPosition.id,
        facultyId: faculty.id,
        startDate: "2026-01-01",
        isActive: true,
      });
    }

    const res = await app.handle(
      new Request("http://localhost/positions/assignments?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
  });

  it("should return empty list when no assignments exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments?page=1&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it("should sort assignments by isActive desc, then startDate desc", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2025-01-01",
      isActive: false,
    });

    await createPositionAssignment({
      userId: user.id,
      positionId: facultyPosition.id,
      facultyId: faculty.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments?page=1&limit=10", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data[0].isActive).toBe(true);
  });
});
