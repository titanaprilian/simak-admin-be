import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("DELETE /positions/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "DELETE",
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without delete permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should delete position successfully", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: { name: "DEKAN", scopeType: "FACULTY" },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(200);

    const deleted = await prisma.position.findUnique({
      where: { id: position.id },
    });
    expect(deleted).toBeNull();
  });

  it("should return 404 when position does not exist", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "delete" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions/non-existent-id", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(404);
  });
});
