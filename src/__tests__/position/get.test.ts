import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createAuthenticatedUser,
  createTestRoleWithPermissions,
  randomIp,
  resetDatabase,
} from "../test_utils";

describe("GET /positions/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/positions/some-id", {
        headers: { "x-forwarded-for": randomIp() },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 without read permission", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/positions/some-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when position not found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const res = await app.handle(
      new Request("http://localhost/positions/non-existent-id", {
        headers: authHeaders,
      }),
    );

    expect(res.status).toBe(404);
  });

  it("should return position when found", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: {
        name: "DEKAN",
        scopeType: "FACULTY",
        isSingleSeat: true,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(position.id);
    expect(body.data.name).toBe("DEKAN");
    expect(body.data.scopeType).toBe("FACULTY");
    expect(body.data.isSingleSeat).toBe(true);
  });

  it("should return position with STUDY_PROGRAM scope", async () => {
    const role = await createTestRoleWithPermissions("TestUser", [
      { featureName: "position_management", action: "read" },
    ]);
    const { authHeaders } = await createAuthenticatedUser({ roleId: role.id });

    const position = await prisma.position.create({
      data: {
        name: "KAPRODI",
        scopeType: "STUDY_PROGRAM",
        isSingleSeat: false,
      },
    });

    const res = await app.handle(
      new Request(`http://localhost/positions/${position.id}`, {
        headers: authHeaders,
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(position.id);
    expect(body.data.name).toBe("KAPRODI");
    expect(body.data.scopeType).toBe("STUDY_PROGRAM");
    expect(body.data.isSingleSeat).toBe(false);
  });
});
