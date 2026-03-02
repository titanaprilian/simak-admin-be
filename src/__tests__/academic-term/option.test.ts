import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /academic-terms/options - Get Academic Term Options", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to seed terms for options testing
  const seedTerms = async () => {
    await prisma.academicTerm.createMany({
      data: [
        {
          academicYear: "2024/2025",
          termType: "GANJIL",
          termOrder: 1,
          startDate: new Date("2024-09-01"),
          endDate: new Date("2025-01-31"),
          isActive: true,
        },
        {
          academicYear: "2023/2024",
          termType: "GENAP",
          termOrder: 2,
          startDate: new Date("2024-02-01"),
          endDate: new Date("2024-06-30"),
          isActive: false,
        },
      ],
    });
  };

  // --- Auth & Permission Tests ---

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/academic-terms/options", {
        method: "GET",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const res = await app.handle(
      new Request("http://localhost/academic-terms/options", {
        method: "GET",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
      }),
    );
    expect(res.status).toBe(403);
  });

  // --- Logic & Mapping Tests ---

  it("should return list of options with correctly concatenated labels", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    await seedTerms();

    const res = await app.handle(
      new Request("http://localhost/academic-terms/options", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);

    // Verify Mapping Logic: label = academicYear + " " + termType
    const ganjilTerm = body.data.find((t: any) => t.label.includes("GANJIL"));
    expect(ganjilTerm.label).toBe("2024/2025 GANJIL");
    expect(ganjilTerm).toHaveProperty("id");

    // Ensure sensitive/extra fields are NOT leaked in options
    expect(ganjilTerm).not.toHaveProperty("startDate");
    expect(ganjilTerm).not.toHaveProperty("isActive");
    expect(ganjilTerm).not.toHaveProperty("termOrder");
  });

  // --- Search & Pagination Tests ---

  it("should filter options by academicYear search query", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    await seedTerms();

    const res = await app.handle(
      new Request("http://localhost/academic-terms/options?search=2024/2025", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].label).toBe("2024/2025 GANJIL");
  });

  it("should respect pagination parameters for options", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);
    await seedTerms();

    const res = await app.handle(
      new Request("http://localhost/academic-terms/options?page=1&limit=1", {
        method: "GET",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.totalPages).toBe(2);
  });

  // --- i18n Test ---

  it("should return Indonesian success message for options", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "read" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms/options", {
        method: "GET",
        headers: {
          ...authHeaders,
          "Accept-Language": "id",
        },
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Data semester akademik berhasil diambil");
  });
});
