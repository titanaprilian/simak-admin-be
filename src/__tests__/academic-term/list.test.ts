import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /academic-terms - List Academic Terms", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to seed multiple terms for testing list functionality
  const seedTerms = async () => {
    await prisma.academicTerm.createMany({
      data: [
        {
          academicYear: "2023/2024",
          termType: "GANJIL",
          termOrder: 1,
          startDate: new Date("2023-09-01"),
          endDate: new Date("2024-01-31"),
          isActive: false,
        },
        {
          academicYear: "2023/2024",
          termType: "GENAP",
          termOrder: 2,
          startDate: new Date("2024-02-01"),
          endDate: new Date("2024-06-30"),
          isActive: true,
        },
        {
          academicYear: "2024/2025",
          termType: "GANJIL",
          termOrder: 1,
          startDate: new Date("2024-09-01"),
          endDate: new Date("2025-01-31"),
          isActive: false,
        },
      ],
    });
  };

  // --- Auth & Permission Tests ---

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/academic-terms"),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
      }),
    );
    expect(res.status).toBe(403);
  });

  // --- Success & Pagination Tests ---

  it("should return paginated list with correct structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    await seedTerms();

    const res = await app.handle(
      new Request("http://localhost/academic-terms?page=1&limit=2", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      total: 3,
      page: 1,
      limit: 2,
      totalPages: 2,
    });
    // Ensure the model matches AcademicTermSafe
    expect(body.data[0]).toHaveProperty("academicYear");
    expect(body.data[0]).toHaveProperty("termType");
  });

  // --- Filter & Search Tests ---

  it("should filter by isActive status", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    await seedTerms();

    const res = await app.handle(
      new Request("http://localhost/academic-terms?isActive=true", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].isActive).toBe(true);
    expect(body.data[0].academicYear).toBe("2023/2024");
  });

  it("should search by academicYear", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    await seedTerms();

    const res = await app.handle(
      new Request("http://localhost/academic-terms?search=2024/2025", {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].academicYear).toBe("2024/2025");
  });

  // --- Validation Tests (Zod Query) ---

  it("should return 400 if limit exceeds 100", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms?limit=101", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues[0].message).toContain("100");
  });

  it("should return 400 if page is less than 1", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms?page=0", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(400);
  });

  // --- i18n Tests ---

  it("should return success message in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms", {
        headers: {
          ...authHeaders,
          "Accept-Language": "es",
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toBe("Términos académicos recuperados con éxito");
  });
});
