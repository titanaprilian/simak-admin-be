import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("DELETE /user-positions/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/user-positions/some-id", {
        method: "DELETE",
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when user-position not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/user-positions/non-existent-id", {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should delete user, lecturer and position assignment successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "delete" },
    ]);

    const fixture = await createUserPositionFixture();

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeNull();

    const deletedUser = await prisma.user.findUnique({
      where: { id: fixture.user.id },
    });
    expect(deletedUser).toBeNull();

    const deletedLecturer = await prisma.lecturer.findUnique({
      where: { id: fixture.lecturer.id },
    });
    expect(deletedLecturer).toBeNull();

    const deletedAssignment = await prisma.positionAssignment.findUnique({
      where: { id: fixture.assignment.id },
    });
    expect(deletedAssignment).toBeNull();
  });

  it("should return 200 even when position assignment was already deleted manually", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_position_management", action: "delete" },
    ]);

    const fixture = await createUserPositionFixture();

    await prisma.positionAssignment.delete({
      where: { id: fixture.assignment.id },
    });

    const res = await app.handle(
      new Request(`http://localhost/user-positions/${fixture.lecturer.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(200);
  });
});

async function createUserPositionFixture() {
  const faculty = await prisma.faculty.create({
    data: { code: "FK_DELETE_TEST", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: {
      facultyId: faculty.id,
      code: "TI_DELETE_TEST",
      name: "Teknik Informatika",
    },
  });

  const position = await prisma.position.create({
    data: {
      name: "KAPRODI_DELETE_TEST",
      scopeType: "STUDY_PROGRAM",
      isSingleSeat: true,
    },
  });

  const role = await prisma.role.create({
    data: { name: "LecturerRoleDeleteTest" },
  });

  const user = await prisma.user.create({
    data: {
      loginId: "dosen_delete_test",
      email: "dosen_delete@test.com",
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
