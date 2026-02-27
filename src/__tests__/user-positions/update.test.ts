import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("PATCH /user-positions/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-positions/some-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when user-position not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-positions/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should update lecturer fullName successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ fullName: "Dr. Updated Name" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.fullName).toBe("Dr. Updated Name");
  });

  it("should update user loginId successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ loginId: "updated_login" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.user.loginId).toBe("updated_login");
  });

  it("should update user email successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ email: "updated@test.com" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.user.email).toBe("updated@test.com");
  });

  it("should update user isActive successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActive: false }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.user.isActive).toBe(false);
  });

  it("should update position assignment successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const newPosition = await prisma.position.create({
      data: {
        name: "WAKIL_KAPRODI_TEST",
        scopeType: "STUDY_PROGRAM",
        isSingleSeat: false,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ positionId: newPosition.id }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.fullName).toBe(fixture.lecturer.fullName);
  });

  it("should update position assignment isActive successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ isActivePosition: false }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.fullName).toBe(fixture.lecturer.fullName);
  });

  it("should update multiple fields at once", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const newPosition = await prisma.position.create({
      data: {
        name: "DOSEN_TEST",
        scopeType: "STUDY_PROGRAM",
        isSingleSeat: false,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          fullName: "Dr. Multi Update",
          loginId: "multi_update",
          email: "multi@test.com",
          positionId: newPosition.id,
          isActivePosition: false,
        }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.fullName).toBe("Dr. Multi Update");
    expect(body.data.user.loginId).toBe("multi_update");
    expect(body.data.user.email).toBe("multi@test.com");
  });

  it("should return 400 if no fields provided for update", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "update" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
  });
});

async function createUserPositionFixture() {
  const faculty = await prisma.faculty.create({
    data: { code: "FK_UPDATE_TEST", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      code: "TI_UPDATE_TEST",
      name: "Teknik Informatika",
    },
  });

  const position = await prisma.position.create({
    data: {
      name: "KAPRODI_UPDATE_TEST",
      scopeType: "STUDY_PROGRAM",
      isSingleSeat: true,
    },
  });

  const role = await prisma.role.create({
    data: { name: "LecturerRoleUpdateTest" },
  });

  const user = await prisma.user.create({
    data: {
      loginId: "dosen_update_test",
      email: "dosen_update@test.com",
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
