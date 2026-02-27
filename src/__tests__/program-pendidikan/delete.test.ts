import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("DELETE /educational-programs/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/educational-programs/some-id", {
        method: "DELETE",
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/educational-programs/some-id", {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when program not found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/educational-programs/non-existent-id", {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should delete program successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "educational_program_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const program = await prisma.educationalProgram.create({
      data: { name: "Teknik Informatika", level: "S1" },
    });

    const res = await app.handle(
      new Request(`http://localhost/educational-programs/${program.id}`, {
        method: "DELETE",
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();

    const deleted = await prisma.educationalProgram.findUnique({
      where: { id: program.id },
    });
    expect(deleted).toBeNull();
  });
});
