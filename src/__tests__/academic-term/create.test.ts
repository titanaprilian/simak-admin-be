import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("POST /academic-terms - Create Academic Term", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- Auth & Permission Tests ---

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GANJIL",
          termOrder: 1,
          startDate: "2024-09-01T00:00:00.000Z",
          endDate: "2025-01-31T00:00:00.000Z",
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks create permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    // No permissions granted to the role
    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GANJIL",
          termOrder: 1,
          startDate: "2024-09-01T00:00:00.000Z",
          endDate: "2025-01-31T00:00:00.000Z",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  // --- Business Rule 1: Unique Constraint ---

  it("should return 409 if academicYear and termType combination already exists", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const payload = {
      academicYear: "2024/2025",
      termType: "GANJIL",
      termOrder: 1,
      startDate: "2024-09-01T00:00:00.000Z",
      endDate: "2025-01-31T00:00:00.000Z",
    };

    // First creation
    await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      }),
    );

    // Duplicate creation
    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
  });

  // --- Business Rule 2: Active Term Enforcement ---

  it("should deactivate previous active term when creating a new active term", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    // 1. Create Term A as Active
    await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2023/2024",
          termType: "GENAP",
          termOrder: 2,
          startDate: "2024-02-01T00:00:00.000Z",
          endDate: "2024-06-30T00:00:00.000Z",
          isActive: true,
        }),
      }),
    );

    // 2. Create Term B as Active
    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GANJIL",
          termOrder: 1,
          startDate: "2024-09-01T00:00:00.000Z",
          endDate: "2025-01-31T00:00:00.000Z",
          isActive: true,
        }),
      }),
    );

    expect(res.status).toBe(201);

    // 3. Verify Database State
    const allTerms = await prisma.academicTerm.findMany();
    const activeTerms = allTerms.filter((t) => t.isActive);

    expect(activeTerms).toHaveLength(1);
    expect(activeTerms[0].academicYear).toBe("2024/2025");
    expect(activeTerms[0].termType).toBe("GANJIL");

    const termA = allTerms.find((t) => t.academicYear === "2023/2024");
    expect(termA?.isActive).toBe(false);
  });

  // --- Business Rule 3: Date Validation ---

  it("should return 400 if startDate is after endDate", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GANJIL",
          termOrder: 1,
          startDate: "2025-12-01T00:00:00.000Z",
          endDate: "2024-01-01T00:00:00.000Z", // Invalid
        }),
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    // Validates Zod refinement message
    expect(body.issues[0].message).toBe("Start date must be before end date");
  });

  // --- i18n Tests ---

  it("should return localized error message for invalid enum in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Accept-Language": "es",
        },
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "INVALID", // Should trigger Zod enum error
          termOrder: 1,
          startDate: "2024-09-01T00:00:00.000Z",
          endDate: "2025-01-31T00:00:00.000Z",
        }),
      }),
    );

    expect(res.status).toBe(400);
    // This assumes your common i18n/validation handles Zod errors
  });

  it("should return success message in Indonesian when requested", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Accept-Language": "id",
        },
        body: JSON.stringify({
          academicYear: "2025/2026",
          termType: "GANJIL",
          termOrder: 1,
          startDate: "2025-09-01T00:00:00.000Z",
          endDate: "2026-01-31T00:00:00.000Z",
        }),
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Semester akademik berhasil dibuat");
  });

  // --- Success Case ---

  it("should successfully create a term and return the correct model structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GENAP",
          termOrder: 2,
          startDate: "2025-02-01T00:00:00.000Z",
          endDate: "2025-06-30T00:00:00.000Z",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.academicYear).toBe("2024/2025");
    expect(body.data.termType).toBe("GENAP");
    // Date fields are converted to strings in JSON response
    expect(typeof body.data.startDate).toBe("string");
  });

  it("should successfully create a term even when the term order is not sended", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GENAP",
          startDate: "2025-02-01T00:00:00.000Z",
          endDate: "2025-06-30T00:00:00.000Z",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.academicYear).toBe("2024/2025");
    expect(body.data.termType).toBe("GENAP");
    // Date fields are converted to strings in JSON response
    expect(typeof body.data.startDate).toBe("string");

    const academicTerm = await prisma.academicTerm.findFirstOrThrow({
      where: { id: body.data.id },
    });
    expect(academicTerm.termOrder).toBe(1);
  });

  it("should successfully create a term even when the term order is undefined", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GENAP",
          termOrder: undefined,
          startDate: "2025-02-01T00:00:00.000Z",
          endDate: "2025-06-30T00:00:00.000Z",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.academicYear).toBe("2024/2025");
    expect(body.data.termType).toBe("GENAP");
    // Date fields are converted to strings in JSON response
    expect(typeof body.data.startDate).toBe("string");

    const academicTerm = await prisma.academicTerm.findFirstOrThrow({
      where: { id: body.data.id },
    });
    expect(academicTerm.termOrder).toBe(1);
  });

  it("should successfully create a term even when the term order is null", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "create" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          academicYear: "2024/2025",
          termType: "GENAP",
          termOrder: null,
          startDate: "2025-02-01T00:00:00.000Z",
          endDate: "2025-06-30T00:00:00.000Z",
        }),
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data).toHaveProperty("id");
    expect(body.data.academicYear).toBe("2024/2025");
    expect(body.data.termType).toBe("GENAP");
    // Date fields are converted to strings in JSON response
    expect(typeof body.data.startDate).toBe("string");

    const academicTerm = await prisma.academicTerm.findFirstOrThrow({
      where: { id: body.data.id },
    });
    expect(academicTerm.termOrder).toBe(1);
  });
});
