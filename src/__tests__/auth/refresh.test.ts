import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import { createTestUser, resetDatabase, randomIp } from "../test_utils";
import { env } from "@/config/env";
import jwt from "jsonwebtoken";

describe("POST /auth/refresh", () => {
  beforeEach(async () => {
    resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should refresh token successfully", async () => {
    await createTestUser({ email: "refresh@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "refresh@test.com",
          password: "password123",
        }),
      }),
    );

    const loginBody = await loginRes.json();
    const validRefreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: validRefreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.access_token).toBeDefined();
    expect(typeof body.data.access_token).toBe("string");
    expect(body.data.refresh_token).toBeDefined();
    expect(body.data.refresh_token).not.toBe(validRefreshToken);
    expect(body.data.user).toBeDefined();
  });

  it("should refresh token successfully and rotate the cookie", async () => {
    await createTestUser({ email: "refresh@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "refresh@test.com",
          password: "password123",
        }),
      }),
    );

    const loginBody = await loginRes.json();
    const validRefreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: validRefreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.access_token).toBeDefined();
    expect(body.data.refresh_token).not.toBe(validRefreshToken);

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("refresh_token=");
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain(body.data.refresh_token);
  });

  it("should return 401 for invalid JWT structure", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: "this-is-not-a-valid-jwt",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should return 401 if token does not exist in DB", async () => {
    await createTestUser({ email: "deleted@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "deleted@test.com",
          password: "password123",
        }),
      }),
    );
    const {
      data: { refresh_token },
    } = await loginRes.json();
    const payloadPart = refresh_token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());
    const tokenId = payload.jti;

    await prisma.refreshToken.delete({
      where: { token: tokenId },
    });

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: refresh_token,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should return 401 for expired refresh token", async () => {
    const user = await createTestUser({ email: "expired@test.com" });

    const secret = env.JWT_REFRESH_SECRET || "default_secret_here";
    const expiredToken = jwt.sign(
      {
        sub: user.id,
        tv: user.tokenVersion,
        jti: "any-uuid",
      },
      secret,
      { expiresIn: "-1h" },
    );

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: expiredToken,
        }),
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBeDefined();
  });

  it("should return 400 for missing refresh token in request body", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for null refresh token", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: null,
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for empty string refresh token", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should detect token reuse and revoke all tokens for that user", async () => {
    const user = await createTestUser({ email: "reuse@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "reuse@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token: oldToken },
    } = await loginRes.json();

    const firstRefresh = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: oldToken,
        }),
      }),
    );

    expect(firstRefresh.status).toBe(200);

    const reuseAttempt = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: oldToken,
        }),
      }),
    );

    expect(reuseAttempt.status).toBe(401);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.tokenVersion).toBeGreaterThan(0);
  });

  it("should return 403 if user account is disabled", async () => {
    const user = await createTestUser({
      email: "disabled_refresh@test.com",
      isActive: true,
    });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "disabled_refresh@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: refresh_token,
        }),
      }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Your account has been disabled.");
  });

  it("should not leak sensitive user data in refresh response", async () => {
    await createTestUser({ email: "noleak_refresh@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "noleak_refresh@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: refresh_token,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.user.password).toBeUndefined();
    expect(body.data.user.passwordHash).toBeUndefined();
    expect(body.data.user.tokenVersion).toBeUndefined();
  });

  it("should handle concurrent refresh attempts safely", async () => {
    await createTestUser({ email: "concurrent_refresh@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "concurrent_refresh@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    const [first, second] = await Promise.all([
      app.handle(
        new Request("http://localhost/auth/refresh", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({
            refresh_token: refresh_token,
          }),
        }),
      ),
      app.handle(
        new Request("http://localhost/auth/refresh", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({
            refresh_token: refresh_token,
          }),
        }),
      ),
    ]);

    const statuses = [first.status, second.status].sort();

    expect(
      (statuses[0] === 200 && statuses[1] === 401) ||
        (statuses[0] === 200 && statuses[1] === 200),
    ).toBe(true);
  });
});
