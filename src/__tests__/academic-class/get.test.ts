import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /academic-classes/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/academic-classes/test-id", {
        method: "GET",
        headers: {
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return academic class by id", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
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

    const academicClass = await prisma.academicClass.create({
      data: {
        name: "A",
        studyProgramId: studyProgram.id,
        enrollmentYear: 2023,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/academic-classes/${academicClass.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(academicClass.id);
    expect(body.data.name).toBe("A");
    expect(body.data.studyProgram).toBeDefined();
    expect(body.data.studyProgram.code).toBe("TI");
  });

  it("should return 404 if academic class not found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/academic-classes/non-existent-id", {
        method: "GET",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_class_management", action: "read" },
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

    const academicClass = await prisma.academicClass.create({
      data: {
        name: "A",
        studyProgramId: studyProgram.id,
        enrollmentYear: 2023,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/academic-classes/${academicClass.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toBe("Detalles de clase académica recuperados");
  });
});
