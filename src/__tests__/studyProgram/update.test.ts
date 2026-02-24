import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("PATCH /study-programs/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/study-programs/some-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/study-programs/some-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should update study program successfully", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const program = await prisma.studyProgram.create({
      data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "Teknik Komputer" }),
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Teknik Komputer");
  });

  it("should return 404 if study program not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/study-programs/non-existent-id", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 409 if code already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "studyProgram_management", action: "update" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    await prisma.studyProgram.createMany({
      data: [
        { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
        { facultyId: faculty.id, code: "SI", name: "Sistem Informasi" },
      ],
    });

    const program = await prisma.studyProgram.findFirst({
      where: { code: "TI" },
    });

    const res = await app.handle(
      new Request(`http://localhost/study-programs/${program!.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ code: "SI" }),
      }),
    );

    expect(res.status).toBe(409);
  });
});
