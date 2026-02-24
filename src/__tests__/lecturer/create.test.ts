import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createLecturerTestFixture,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
  createTestUser,
} from "../test_utils";

describe("POST /lecturers", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      userId: "test",
      nik: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: "test",
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
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
    const { user, program } = await createLecturerTestFixture();

    const payload = {
      userId: user.id,
      nik: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should create lecturer successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();
    const user = await createTestUser({
      id: "test-new-user-id",
      email: "testnewuserid@example.com",
    });

    const payload = {
      userId: user.id,
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.fullName).toBe("Dr. Budi");
  });

  it("should return 400 if userId is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();

    const payload = {
      nik: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if nik is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { user, program } = await createLecturerTestFixture();

    const payload = {
      userId: user.id,
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
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

    const { user, program } = await createLecturerTestFixture();

    const payload = {
      userId: user.id,
      nik: "123456",
      fullName: "Dr. Budi",
      gender: "INVALID",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if user does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { program } = await createLecturerTestFixture();

    const payload = {
      userId: "non-existent-id",
      nik: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
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

    const { user } = await createLecturerTestFixture();

    const payload = {
      userId: user.id,
      nik: "123456",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: "non-existent-id",
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if user already has lecturer profile", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "lecturer_management", action: "create" },
    ]);

    const { user, program } = await createLecturerTestFixture();

    const payload = {
      userId: user.id,
      nik: "999999",
      fullName: "Dr. Siapa",
      gender: "MALE",
      studyProgramId: program.id,
    };

    const res = await app.handle(
      new Request("http://localhost/lecturers", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(400);
  });
});
