import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";
import jwt from "jsonwebtoken";

describe("GET /academic-terms/:id - Get Academic Term Detail", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to seed a single term
  const seedTerm = async () => {
    return await prisma.academicTerm.create({
      data: {
        academicYear: "2024/2025",
        termType: "GANJIL",
        termOrder: 1,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-01-31"),
        isActive: true,
      },
    });
  };

  // --- Auth & Permission Tests ---

  it("should return 401 if not logged in", async () => {
    const term = await seedTerm();
    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "GET",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "GET",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
      }),
    );
    expect(res.status).toBe(403);
  });

  // --- Success Case ---

  it("should return 200 and valid academic term data", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);

    // Validate Data Structure (Based on AcademicTermSafe model)
    expect(body.data.id).toBe(term.id);
    expect(body.data.academicYear).toBe("2024/2025");
    expect(body.data.termType).toBe("GANJIL");
    expect(body.data.isActive).toBe(true);

    // Ensure dates are returned as ISO strings
    expect(typeof body.data.startDate).toBe("string");
    expect(new Date(body.data.startDate).getTime()).toBe(
      term.startDate.getTime(),
    );
  });

  // --- Error & Edge Cases ---

  it("should return 404 if term ID does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms/non-existent-id", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return 401 if token is expired", async () => {
    const { user } = await createAuthenticatedUser();
    const term = await seedTerm();

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  // --- i18n Tests ---

  it("should return 'Not Found' message in Indonesian when requested", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms/clp123", {
        method: "GET",
        headers: {
          ...authHeaders,
          "Accept-Language": "id",
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.message).toBe("Semester akademik tidak ditemukan");
  });

  it("should return 'Success' message in Spanish when requested", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          "Accept-Language": "es",
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toBe("Términos académicos recuperados con éxito");
    // Note: ensure "academicTerm.getSuccess" is added to your es.ts
  });
});
