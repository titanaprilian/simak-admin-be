import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /study-programs/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/study-programs/some-id", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/study-programs/some-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return study program by id", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const program = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.code).toBe("TI");
    expect(body.data.name).toBe("Teknik Informatika");
  });

  it("should return 404 if study program not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs/non-existent-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should include faculty and lecturers in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const program = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.faculty).toBeDefined();
    expect(body.data.faculty.code).toBe("FK");
  });
});
