import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /academic-classes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const payload = {
      name: "A",
      studyProgramId: "test",
      enrollmentYear: 2023,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
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

  it("should create academic class successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "create" },
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
      name: "A",
      studyProgramId: studyProgram.id,
      enrollmentYear: 2023,
      capacity: 30,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
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
    expect(body.data.name).toBe("A");
    expect(body.data.studyProgramId).toBe(studyProgram.id);
    expect(body.data.enrollmentYear).toBe(2023);
  });

  it("should return 409 if duplicate academic class", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "create" },
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
        name: "A",
        studyProgramId: studyProgram.id,
        enrollmentYear: 2023,
      },
    });

    const payload = {
      name: "A",
      studyProgramId: studyProgram.id,
      enrollmentYear: 2023,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
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
      { featureName: "academic_class_management", action: "create" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const payload = {
      name: "A",
      studyProgramId: "non-existent-id",
      enrollmentYear: 2023,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
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

  it("should create academic class with advisor lecturer", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "create" },
    ]);
    const { authHeaders, user } = await createAuthenticatedUser({
      roleId: role.id,
    });

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

    const lecturer = await prisma.lecturer.create({
      data: {
        userId: user.id,
        fullName: "Dr. John Doe",
        gender: "male",
        studyProgramId: studyProgram.id,
      },
    });

    const payload = {
      name: "A",
      studyProgramId: studyProgram.id,
      enrollmentYear: 2023,
      advisorLecturerId: lecturer.id,
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
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
    expect(body.data.advisorLecturerId).toBe(lecturer.id);
  });

  it("should return 400 if advisor lecturer not found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "create" },
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
      name: "A",
      studyProgramId: studyProgram.id,
      enrollmentYear: 2023,
      advisorLecturerId: "non-existent-id",
    };

    const res = await app.handle(
      new Request("http://localhost/academic-classes", {
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
