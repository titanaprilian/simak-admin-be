import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /academic-classes/bulk", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      studyProgramId: "test",
      enrollmentYear: 2024,
      totalClasses: 3,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes/bulk", {
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

  it("should bulk create academic classes successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const studyProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const payload = {
      studyProgramId: studyProgram.id,
      enrollmentYear: 2024,
      totalClasses: 3,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes/bulk", {
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
    expect(body.data.count).toBe(3);

    const classes = await prisma.academicClass.findMany({
      where: {
        studyProgramId: studyProgram.id,
        enrollmentYear: 2024,
      },
      orderBy: { name: "asc" },
    });

    expect(classes.length).toBe(3);
    expect(classes[0].name).toBe("TI-2024-A");
    expect(classes[1].name).toBe("TI-2024-B");
    expect(classes[2].name).toBe("TI-2024-C");
  });

  it("should return 409 if duplicate class exists", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const studyProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    await prisma.academicClass.create({
      data: {
        name: "TI-2024-A",
        studyProgramId: studyProgram.id,
        enrollmentYear: 2024,
      },
    });

    const payload = {
      studyProgramId: studyProgram.id,
      enrollmentYear: 2024,
      totalClasses: 3,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes/bulk", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should return 400 if study program not found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      studyProgramId: "non-existent-id",
      enrollmentYear: 2024,
      totalClasses: 3,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes/bulk", {
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

  it("should return 400 if totalClasses > 26", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const educationalProgram = await prisma.educationalProgram.create({
      data: { name: "Sarjana (S1)", level: "S1" },
    });

    const studyProgram = await prisma.studyProgram.create({
      data: {
        facultyId: faculty.id,
        code: "TI",
        name: "Teknik Informatika",
        educationalProgramId: educationalProgram.id,
      },
    });

    const payload = {
      studyProgramId: studyProgram.id,
      enrollmentYear: 2024,
      totalClasses: 27,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes/bulk", {
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
