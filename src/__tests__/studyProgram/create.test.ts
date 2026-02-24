import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /study-programs", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      facultyId: "test",
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const payload = {
      facultyId: faculty.id,
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should create study program successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const payload = {
      facultyId: faculty.id,
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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
    expect(body.data.code).toBe("TI");
    expect(body.data.name).toBe("Teknik Informatika");
  });

  it("should return 400 if facultyId is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const payload = { code: "TI", name: "Teknik Informatika" };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should return 400 if code is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const payload = { facultyId: faculty.id, name: "Teknik Informatika" };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should return 400 if name is missing", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const payload = { facultyId: faculty.id, code: "TI" };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should return 400 if facultyId does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const payload = {
      facultyId: "non-existent-id",
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
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

  it("should return 409 if code already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "create" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "TI", name: "Existing Program" },
    });

    const payload = {
      facultyId: faculty.id,
      code: "TI",
      name: "Teknik Informatika",
    };

    const res = await app.handle(
      new Request("http://localhost/study-programs", {
        method: "POST",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
  });
});
