import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import { createTestUser, resetDatabase, randomIp } from "../test_utils";
import jwt from "jsonwebtoken";

describe.only("POST /auth/logout/all", () => {
  beforeEach(async () => {
    resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should logout from all devices (increment token version)", async () => {
    await createTestUser({ email: "logout_all@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "logout_all@test.com",
          password: "password123",
        }),
      }),
    );
    const {
      data: { access_token, refresh_token },
    } = await loginRes.json();

    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-forwarded-for": randomIp(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ refresh_token }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Logged out from all devices");
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("Max-Age=0");

    const user = await prisma.user.findUnique({
      where: { email: "logout_all@test.com" },
    });
    expect(user?.tokenVersion).toBeGreaterThan(0);

    const refreshRes = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token }),
      }),
    );

    expect(refreshRes.status).toBe(401);
  });

  it("should return 401 if no access token provided", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("should return 401 if the provided refresh token is already revoked", async () => {
    await createTestUser({ email: "revoked_logout@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "revoked_logout@test.com",
          password: "password123",
        }),
      }),
    );
    const {
      data: { access_token, refresh_token },
    } = await loginRes.json();

    const payloadPart = refresh_token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());

    await prisma.refreshToken.update({
      where: { token: payload.jti },
      data: { revoked: true },
    });

    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-forwarded-for": randomIp(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ refresh_token }),
      }),
    );

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.message).toBe("Invalid refresh token");
  });

  it("should return 401 if access token is expired", async () => {
    await createTestUser({ email: "expired_access@test.com" });

    const expiredAccessToken = jwt.sign(
      { userId: "test-user-id" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "-1h" },
    );

    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${expiredAccessToken}`,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          refresh_token: "some-token",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should return 400 if no refresh token provided (no body, no cookie)", async () => {
    await createTestUser({ email: "no_refresh@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "no_refresh@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { access_token },
    } = await loginRes.json();

    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should invalidate all refresh tokens across all devices", async () => {
    await createTestUser({ email: "multi_device@test.com" });

    const device1 = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "multi_device@test.com",
          password: "password123",
        }),
      }),
    );
    const device1Tokens = (await device1.json()).data;

    const device2 = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "multi_device@test.com",
          password: "password123",
        }),
      }),
    );
    const device2Tokens = (await device2.json()).data;

    await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${device1Tokens.access_token}`,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token: device1Tokens.refresh_token }),
      }),
    );

    const refresh1 = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token: device1Tokens.refresh_token }),
      }),
    );

    const refresh2 = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token: device2Tokens.refresh_token }),
      }),
    );

    expect(refresh1.status).toBe(401);
    expect(refresh2.status).toBe(401);
  });

  it("should clear refresh token cookie", async () => {
    await createTestUser({ email: "cookie_clear@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "cookie_clear@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { access_token, refresh_token },
    } = await loginRes.json();

    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token }),
      }),
    );

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
  });

  it("should return 403 if user account is disabled", async () => {
    const user = await createTestUser({ email: "disabled_all@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "disabled_all@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { access_token, refresh_token },
    } = await loginRes.json();

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const response = await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("should handle concurrent logout all requests safely", async () => {
    await createTestUser({ email: "concurrent_all@test.com" });

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "concurrent_all@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { access_token, refresh_token },
    } = await loginRes.json();

    const [first, second, third] = await Promise.all([
      app.handle(
        new Request("http://localhost/auth/logout/all", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({ refresh_token }),
        }),
      ),
      app.handle(
        new Request("http://localhost/auth/logout/all", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({ refresh_token }),
        }),
      ),
      app.handle(
        new Request("http://localhost/auth/logout/all", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "content-type": "application/json",
            "x-forwarded-for": randomIp(),
          },
          body: JSON.stringify({ refresh_token }),
        }),
      ),
    ]);

    const statuses = [first.status, second.status, third.status];
    expect(statuses).toContain(200);
  });

  it("should allow new login after logout all", async () => {
    await createTestUser({ email: "relogin_after_all@test.com" });

    const firstLogin = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "relogin_after_all@test.com",
          password: "password123",
        }),
      }),
    );

    const {
      data: { access_token, refresh_token },
    } = await firstLogin.json();

    await app.handle(
      new Request("http://localhost/auth/logout/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token }),
      }),
    );

    const secondLogin = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "relogin_after_all@test.com",
          password: "password123",
        }),
      }),
    );

    expect(secondLogin.status).toBe(200);
    const newTokens = (await secondLogin.json()).data;
    expect(newTokens.access_token).toBeDefined();
    expect(newTokens.refresh_token).toBeDefined();

    const refreshAttempt = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({ refresh_token: newTokens.refresh_token }),
      }),
    );

    expect(refreshAttempt.status).toBe(200);
  });
});
