import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createLecturerTestFixture,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /user-lecturers", () => {
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
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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
    const { program } = await createLecturerTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: "test-role-id",
      isActive: true,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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

  it("should create user and lecturer successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();
    const role = await prisma.role.findFirst({
      where: { name: "LecturerRole" },
    });

    const payload = {
      loginId: "dosen123",
      email: "dosen123@test.com",
      password: "password123",
      roleId: role!.id,
      isActive: true,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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

  it("should return 400 if loginId is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();
    const role = await prisma.role.findFirst({
      where: { name: "LecturerRole" },
    });

    const payload = {
      email: "dosen@test.com",
      password: "password123",
      roleId: role!.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();
    const role = await prisma.role.findFirst({
      where: { name: "LecturerRole" },
    });

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      roleId: role!.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();
    const role = await prisma.role.findFirst({
      where: { name: "LecturerRole" },
    });

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: role!.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "INVALID",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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

  it("should return 400 if role does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: "non-existent-role-id",
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();
    const role = await prisma.role.findFirst({
      where: { name: "LecturerRole" },
    });

    const payload = {
      loginId: "dosen123",
      email: "dosen@test.com",
      password: "password123",
      roleId: role!.id,
      nidn: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: "non-existent-program-id",
    };

    const res = await app.handle(
      new Request("http://localhost/user-lecturers", {
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
