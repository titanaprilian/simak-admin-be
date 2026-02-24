import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /faculties/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/faculties/some-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return faculty by id", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: { code: "FK", name: "Fakultas Teknik" },
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.code).toBe("FK");
    expect(body.data.name).toBe("Fakultas Teknik");
  });

  it("should return 404 if faculty not found", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/faculties/non-existent-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should include programs in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const faculty = await prisma.faculty.create({
      data: {
        code: "FK",
        name: "Fakultas Teknik",
        programs: {
          create: [
            { code: "TI", name: "Teknik Informatika" },
            { code: "SI", name: "Sistem Informasi" },
          ],
        },
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/faculties/${faculty.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.programs).toHaveLength(2);
  });
});
