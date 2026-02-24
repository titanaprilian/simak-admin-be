import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /faculties", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/faculties", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no faculty_management read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 403 if user only has create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return empty list when no faculties exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("should return faculties with correct pagination", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    await prisma.faculty.createMany({
      data: [
        { code: "FK", name: "Fakultas Teknik" },
        { code: "FKM", name: "Fakultas Kedokteran" },
        { code: "FH", name: "Fakultas Hukum" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/faculties?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
  });

  it("should filter faculties by search", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    await prisma.faculty.createMany({
      data: [
        { code: "FK", name: "Fakultas Teknik" },
        { code: "FKM", name: "Fakultas Kedokteran" },
        { code: "FH", name: "Fakultas Hukum" },
      ],
    });

    const res = await app.handle(
      new Request("http://localhost/faculties?search=kedokteran", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Fakultas Kedokteran");
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    await prisma.faculty.create({
      data: { code: "TEST", name: "Test Faculty" },
    });

    const res = await app.handle(
      new Request("http://localhost/faculties", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    body.data.forEach((faculty: any) => {
      expect(faculty).toHaveProperty("id");
      expect(faculty).toHaveProperty("code");
      expect(faculty).toHaveProperty("name");
      expect(faculty).toHaveProperty("createdAt");
      expect(faculty).toHaveProperty("updatedAt");
    });
  });

  it("should return 400 if page is 0", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/faculties?page=0", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 if limit exceeds maximum", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "faculty_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/faculties?limit=999", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });
});
