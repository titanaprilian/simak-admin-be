import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import { createTestUser, resetDatabase, randomIp } from "../test_utils";

describe("POST /auth/login", () => {
  beforeEach(async () => {
    resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should login successfully and return tokens", async () => {
    const user = await createTestUser({ email: "login@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "login@test.com",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.access_token).toBeDefined();
    expect(body.data.refresh_token).toBeDefined();
    expect(typeof body.data.access_token).toBe("string");
    expect(body.data.user.id).toBe(user.id);
    expect(body.data.user.email).toBe("login@test.com");
  });

  it("should set a secure httpOnly cookie in the response", async () => {
    await createTestUser({ email: "cookie@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "cookie@test.com",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).not.toBeNull();

    expect(setCookieHeader).toContain("refresh_token=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain("SameSite=Lax");
  });

  it("should handle case-insensitive email login", async () => {
    await createTestUser({ email: "login@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "Login@Test.COM",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.access_token).toBeDefined();
    expect(body.data.user.email).toBe("login@test.com");
  });

  it("should return 401 for incorrect password", async () => {
    await createTestUser({ email: "wrongpass@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "wrongpass@test.com",
          password: "wrong_password",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Invalid email or password");
  });

  it("should return 401 for non-existent email", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "ghost@test.com",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should return 403 if account is disabled", async () => {
    await createTestUser({
      email: "disabled@test.com",
      isActive: false,
    });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "disabled@test.com",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.message).toBe("Your account has been disabled.");
  });

  it("should return 400 for invalid input format", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "not-an-email",
          password: "123",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should allow multiple active sessions (multi-device support)", async () => {
    await createTestUser({ email: "relogin@test.com" });

    const firstLogin = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "relogin@test.com",
          password: "password123",
        }),
      }),
    );
    const firstBody = await firstLogin.json();
    const firstRefreshToken = firstBody.data.refresh_token;

    const secondLogin = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "relogin@test.com",
          password: "password123",
        }),
      }),
    );

    expect(secondLogin.status).toBe(200);

    const refreshAttempt = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
          cookie: `refresh_token=${firstRefreshToken}`,
        },
        body: JSON.stringify({}),
      }),
    );

    expect(refreshAttempt.status).toBe(200);
    const refreshBody = await refreshAttempt.json();
    expect(refreshBody.data.access_token).toBeDefined();
  });

  it("should create separate refresh token records for each login", async () => {
    const user = await createTestUser({ email: "multidevice@test.com" });

    await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "multidevice@test.com",
          password: "password123",
        }),
      }),
    );

    await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "multidevice@test.com",
          password: "password123",
        }),
      }),
    );

    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });

    expect(refreshTokens.length).toBe(2);
  });

  it("should return 400 for empty email", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for whitespace-only email", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "   ",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for empty password", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "test@test.com",
          password: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for missing email field", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for missing password field", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "test@test.com",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should handle email with leading/trailing whitespace", async () => {
    await createTestUser({ email: "trim@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "  trim@test.com  ",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect([200, 400]).toContain(response.status);
    if (response.status === 200) {
      expect(body.data.user.email).toBe("trim@test.com");
    }
  });

  it("should safely handle SQL injection attempts in email", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "admin'--",
          password: "password123",
        }),
      }),
    );

    expect([400, 401]).toContain(response.status);
  });

  it("should handle extremely long email input", async () => {
    const longEmail = "a".repeat(300) + "@test.com";

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: longEmail,
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should handle extremely long password input", async () => {
    await createTestUser({ email: "longpass@test.com" });
    const longPassword = "a".repeat(10000);

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "longpass@test.com",
          password: longPassword,
        }),
      }),
    );

    expect([400, 401]).toContain(response.status);
  });

  it("should not leak password hash in response", async () => {
    await createTestUser({ email: "noleak@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "noleak@test.com",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.user.password).toBeUndefined();
    expect(body.data.user.passwordHash).toBeUndefined();
  });

  it("should create refresh token record in database", async () => {
    const user = await createTestUser({ email: "dbtoken@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "dbtoken@test.com",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(200);

    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });

    expect(refreshTokens.length).toBeGreaterThan(0);
    expect(refreshTokens[0].userId).toBe(user.id);
  });

  it("should handle multiple concurrent login sessions", async () => {
    await createTestUser({ email: "concurrent@test.com" });

    const [firstLogin, secondLogin] = await Promise.all([
      app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({
            email: "concurrent@test.com",
            password: "password123",
          }),
        }),
      ),
      app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({
            email: "concurrent@test.com",
            password: "password123",
          }),
        }),
      ),
    ]);

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);

    const firstBody = await firstLogin.json();
    const secondBody = await secondLogin.json();

    expect(firstBody.data.access_token).toBeDefined();
    expect(secondBody.data.access_token).toBeDefined();
    expect(firstBody.data.refresh_token).not.toBe(
      secondBody.data.refresh_token,
    );
  });
});
