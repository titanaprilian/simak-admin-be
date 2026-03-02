import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("DELETE /academic-terms/:id - Delete Academic Term", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to seed a term for deletion
  const seedTerm = async () => {
    return await prisma.academicTerm.create({
      data: {
        academicYear: "2024/2025",
        termType: "GANJIL",
        termOrder: 1,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-01-31"),
        isActive: false,
      },
    });
  };

  // --- Auth & Permission Tests ---

  it("should return 401 if not logged in", async () => {
    const term = await seedTerm();
    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "DELETE",
        headers: { ...authHeaders, "x-forwarded-for": randomIp() },
      }),
    );
    expect(res.status).toBe(403);
  });

  // --- Success Case ---

  it("should successfully delete a term and return 200", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "delete" },
    ]);
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(200);

    // Verify record is gone from DB
    const deletedTerm = await prisma.academicTerm.findUnique({
      where: { id: term.id },
    });
    expect(deletedTerm).toBeNull();
  });

  // --- Error Cases ---

  it("should return 404 if term does not exist", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "delete" },
    ]);

    const res = await app.handle(
      new Request("http://localhost/academic-terms/clp123abc000001", {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  // --- i18n Tests ---

  it("should return English success message by default", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "delete" },
    ]);
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Academic term deleted successfully");
  });

  it("should return Spanish success message when requested", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "delete" },
    ]);
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "Accept-Language": "es",
        },
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Término académico eliminado con éxito");
  });

  it("should return Indonesian success message when requested", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "academic_term_management", action: "delete" },
    ]);
    const term = await seedTerm();

    const res = await app.handle(
      new Request(`http://localhost/academic-terms/${term.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "Accept-Language": "id",
        },
      }),
    );

    const body = await res.json();
    expect(body.message).toBe("Semester akademik berhasil dihapus");
  });
});
