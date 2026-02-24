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

describe("POST /positions/assignments", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: "test",
          positionId: "test",
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: "test",
          positionId: "test",
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should create FACULTY scope assignment", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          facultyId: faculty.id,
          startDate: "2026-01-01",
          isActive: true,
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.position.name).toBe(facultyPosition.name);
    expect(body.data.faculty.code).toBe(faculty.code);
    expect(body.data.isActive).toBe(true);
  });

  it("should create STUDY_PROGRAM scope assignment", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { studyProgram, user, studyProgramPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: studyProgramPosition.id,
          studyProgramId: studyProgram.id,
          startDate: "2026-01-01",
          isActive: true,
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.position.name).toBe(studyProgramPosition.name);
    expect(body.data.studyProgram.code).toBe(studyProgram.code);
  });

  it("should create assignment with endDate", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          facultyId: faculty.id,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          isActive: true,
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.endDate).toBe("2026-12-31T00:00:00.000Z");
  });

  it("should create assignment with default isActive true", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          facultyId: faculty.id,
          startDate: "2026-01-01",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.isActive).toBe(true);
  });

  it("should return 400 when startDate is invalid", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          facultyId: faculty.id,
          startDate: "invalid-date",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when endDate is before startDate", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, user, facultyPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          facultyId: faculty.id,
          startDate: "2026-12-31",
          endDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when FACULTY scope has no facultyId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { user, facultyPosition } = await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when STUDY_PROGRAM scope has facultyId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { faculty, studyProgram, user, studyProgramPosition } =
      await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: studyProgramPosition.id,
          facultyId: faculty.id,
          studyProgramId: studyProgram.id,
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when STUDY_PROGRAM scope has no studyProgramId", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { user, studyProgramPosition } = await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: studyProgramPosition.id,
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when studyProgram is outside faculty", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty1 = await prisma.faculty.create({
      data: { code: "FK1", name: "Fakultas Teknik" },
    });
    const faculty2 = await prisma.faculty.create({
      data: { code: "FH", name: "Fakultas Hukum" },
    });

    const studyProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty2.id,
        code: "HI",
        name: "Hukum Islam",
      },
    });

    const userRole = await prisma.role.create({ data: { name: "UserRole" } });
    const user = await prisma.user.create({
      data: {
        loginId: "test-user",
        email: "test-user@test.com",
        password: "hashed",
        roleId: userRole.id,
      },
    });

    const facultyPosition = await prisma.position.create({
      data: {
        name: "DEKAN",
        scopeType: "FACULTY",
        isSingleSeat: false,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: facultyPosition.id,
          facultyId: faculty1.id,
          studyProgramId: studyProgram.id,
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 409 when single-seat position is already occupied (FACULTY)", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
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

    const user2Role = await prisma.role.create({ data: { name: "User2Role" } });
    const user2 = await prisma.user.create({
      data: {
        loginId: "user2",
        email: "user2@test.com",
        password: "hashed",
        roleId: user2Role.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user2.id,
          positionId: facultyPosition.id,
          facultyId: faculty.id,
          startDate: "2026-01-01",
          isActive: true,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should return 409 when single-seat position is already occupied (STUDY_PROGRAM)", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { studyProgram, user, studyProgramPosition } =
      await createPositionTestFixture();

    await createPositionAssignment({
      userId: user.id,
      positionId: studyProgramPosition.id,
      studyProgramId: studyProgram.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const user2Role = await prisma.role.create({ data: { name: "User2Role" } });
    const user2 = await prisma.user.create({
      data: {
        loginId: "user2",
        email: "user2@test.com",
        password: "hashed",
        roleId: user2Role.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user2.id,
          positionId: studyProgramPosition.id,
          studyProgramId: studyProgram.id,
          startDate: "2026-01-01",
          isActive: true,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should allow multiple assignments for non-single-seat position", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { studyProgram, user, multiSeatPosition } =
      await createPositionTestFixture();

    await createPositionAssignment({
      userId: user.id,
      positionId: multiSeatPosition.id,
      studyProgramId: studyProgram.id,
      startDate: "2026-01-01",
      isActive: true,
    });

    const user2Role = await prisma.role.create({ data: { name: "User2Role" } });
    const user2 = await prisma.user.create({
      data: {
        loginId: "user2",
        email: "user2@test.com",
        password: "hashed",
        roleId: user2Role.id,
      },
    });

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user2.id,
          positionId: multiSeatPosition.id,
          studyProgramId: studyProgram.id,
          startDate: "2026-01-01",
          isActive: true,
        }),
      }),
    );

    expect(res.status).toBe(201);
  });

  it("should return 400 when position does not exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const { user } = await createPositionTestFixture();

    const res = await app.handle(
      new Request("http://localhost/positions/assignments", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: "non-existent-position",
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(res.status).toBe(400);
  });
});
