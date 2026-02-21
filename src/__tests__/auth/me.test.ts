import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createTestUser,
  createAuthenticatedUser,
  resetDatabase,
  randomIp,
} from "../test_utils";
import jwt from "jsonwebtoken";

describe("GET /auth/me", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 401 if not logged in", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is expired", async () => {
    const user = await createTestUser({ email: "expired@test.com" });

    const expiredToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if access token is invalid", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          Authorization: "Bearer invalid-token",
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it.only("should return user data with role name", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(user.id);
    expect(body.data.email).toBe(user.email);
    expect(body.data.name).toBe(user.name);
    expect(body.data.roleName).toBeDefined();
    expect(typeof body.data.roleName).toBe("string");
  });

  it("should return correct role name for user", async () => {
    const role = await prisma.role.create({
      data: { name: "AdminUser", description: "Admin role" },
    });

    const user = await createTestUser({
      email: "admin@test.com",
      roleId: role.id,
    });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "admin@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { access_token },
    } = await loginRes.json();

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roleName).toBe("AdminUser");
  });

  it("should not return password in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.password).toBeUndefined();
  });

  it("should not return tokenVersion in response", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.tokenVersion).toBeUndefined();
  });

  it("should return 401 if user no longer exists", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 401 if token version is outdated after logout all", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("should return 403 if user account is disabled", async () => {
    const { authHeaders, user } = await createAuthenticatedUser();

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should return correct response structure", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const res = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: {
          ...authHeaders,
          "x-forwarded-for": randomIp(),
        },
      }),
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("email");
    expect(body.data).toHaveProperty("name");
    expect(body.data).toHaveProperty("roleName");
    expect(body.data).toHaveProperty("createdAt");
    expect(body.data).toHaveProperty("updatedAt");
  });

  it("should handle concurrent requests consistently", async () => {
    const { authHeaders } = await createAuthenticatedUser();

    const [r1, r2, r3] = await Promise.all([
      app.handle(
        new Request("http://localhost/auth/me", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request("http://localhost/auth/me", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
      app.handle(
        new Request("http://localhost/auth/me", {
          headers: { ...authHeaders, "x-forwarded-for": randomIp() },
        }),
      ),
    ]);

    const [b1, b2, b3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(b1.data.id).toBe(b2.data.id);
    expect(b2.data.id).toBe(b3.data.id);
  });
});
