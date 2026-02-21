import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import { createTestUser, resetDatabase, randomIp } from "../test_utils";
import jwt from "jsonwebtoken";

describe("POST /auth/logout", () => {
  beforeEach(async () => {
    resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should logout successfully, revoke DB token, and clear browser cookie", async () => {
    await createTestUser({ email: "logout@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "logout@test.com",
          password: "password123",
        }),
      }),
    );
    const {
      data: { refresh_token },
    } = await loginRes.json();

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
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
    expect(body.message).toBe("Logged out successfully");

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("Max-Age=0");
    expect(setCookieHeader).toContain("Path=/");

    const payloadPart = refresh_token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: payload.jti },
    });
    expect(storedToken?.revoked).toBe(true);
  });

  it("should return 200 (Idempotent) even for invalid token structure", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: "invalid-jwt-structure",
        }),
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe("Logged out successfully");
  });

  it("should return 400 for null refresh token", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
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

  it("should return 200 for empty string refresh token (idempotent)", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
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

    expect(response.status).toBe(200);
  });

  it("should be idempotent when token is already revoked", async () => {
    await createTestUser({ email: "already_revoked@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "already_revoked@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    const firstLogout = await app.handle(
      new Request("http://localhost/auth/logout", {
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

    expect(firstLogout.status).toBe(200);

    const secondLogout = await app.handle(
      new Request("http://localhost/auth/logout", {
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

    expect(secondLogout.status).toBe(200);
    const body = await secondLogout.json();
    expect(body.message).toBe("Logged out successfully");
  });

  it("should be idempotent when token doesn't exist in database", async () => {
    await createTestUser({ email: "nonexistent_token@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "nonexistent_token@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    const payloadPart = refresh_token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());

    await prisma.refreshToken.delete({
      where: { token: payload.jti },
    });

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
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

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Logged out successfully");
  });

  it("should successfully logout even with expired token", async () => {
    await createTestUser({ email: "expired_logout@test.com" });

    const expiredToken = jwt.sign(
      {
        userId: "test-user-id",
        jti: "expired-logout-token",
        tokenVersion: 0,
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "-1h" },
    );

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
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

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Logged out successfully");
  });

  it("should handle logout with token containing invalid signature", async () => {
    await createTestUser({ email: "invalid_sig_logout@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "invalid_sig_logout@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    const parts = refresh_token.split(".");
    const tamperedToken = parts[0] + "." + parts[1] + ".invalid_signature";

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: tamperedToken,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Logged out successfully");
  });

  it("should handle concurrent logout attempts gracefully", async () => {
    await createTestUser({ email: "concurrent_logout@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "concurrent_logout@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { refresh_token },
    } = await loginRes.json();

    const [first, second, third] = await Promise.all([
      app.handle(
        new Request("http://localhost/auth/logout", {
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
        new Request("http://localhost/auth/logout", {
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
        new Request("http://localhost/auth/logout", {
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

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
  });
});
