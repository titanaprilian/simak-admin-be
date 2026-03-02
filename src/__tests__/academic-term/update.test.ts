import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("PATCH /academic-terms/:id - Update Academic Term", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to seed terms for update tests
  const seedTerms = async () => {
    const term1 = await prisma.academicTerm.create({
      data: {
        academicYear: "2023/2024",
        termType: "GANJIL",
        termOrder: 1,
        startDate: new Date("2023-09-01"),
        endDate: new Date("2024-01-31"),
        isActive: true,
      },
    });

    const term2 = await prisma.academicTerm.create({
      data: {
        academicYear: "2023/2024",
        termType: "GENAP",
        termOrder: 2,
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-06-30"),
        isActive: false,
      },
    });

    return { term1, term2 };
  };

  // --- Auth & Permission Tests ---

  it("should return 401 if not logged in", async () => {
    const { term1 } = await seedTerms();
    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ termOrder: 3 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks update permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const { term1 } = await seedTerms();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term1.id}`, {
        method: "PATCH",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({ termOrder: 3 }),
      }),
    );
    expect(res.status).toBe(403);
  });

  // --- Business Rule 2: Active Term Enforcement (Update) ---

  it("should deactivate other terms when an inactive term is set to active", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "update" },
    ]);
    const { term1, term2 } = await seedTerms();

    // Verify initial state: Term 1 is active, Term 2 is inactive
    expect(term1.isActive).toBe(true);
    expect(term2.isActive).toBe(false);

    // Update Term 2 to isActive: true
    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term2.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ isActive: true }),
      }),
    );

    expect(res.status).toBe(200);

    // Verify Final State via DB
    const updatedTerm1 = await prisma.academicTerm.findUnique({
      where: { id: term1.id },
    });
    const updatedTerm2 = await prisma.academicTerm.findUnique({
      where: { id: term2.id },
    });

    expect(updatedTerm2?.isActive).toBe(true);
    expect(updatedTerm1?.isActive).toBe(false); // Should have been deactivated
  });

  // --- Business Rule 3: Date Validation (Update) ---

  it("should return 400 if update results in invalid date range (startDate > endDate)", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "update" },
    ]);
    const { term1 } = await seedTerms();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term1.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          startDate: "2026-01-01T00:00:00.000Z", // Setting start after the existing end date
        }),
      }),
    );

    // Note: Zod partial refinement checks this
    expect(res.status).toBe(400);
  });

  // --- Validation Tests ---

  it("should return 400 if request body is empty", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "update" },
    ]);
    const { term1 } = await seedTerms();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term1.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({}), // Empty body fails .refine() in schema
      }),
    );

    expect(res.status).toBe(400);
  });

  it("should return 404 if term ID does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "update" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms/non-existent-id", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ academicYear: "2025/2026" }),
      }),
    );

    expect(res.status).toBe(404);
  });

  // --- i18n Tests ---

  it("should return Spanish success message on update", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "update" },
    ]);
    const { term1 } = await seedTerms();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term1.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Accept-Language": "es",
        },
        body: JSON.stringify({ termOrder: 5 }),
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Término académico actualizado con éxito");
  });
});
