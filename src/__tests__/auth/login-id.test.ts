import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import { createTestUser, randomIp, resetDatabase } from "../test_utils";

describe("POST /auth/login-id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should login successfully using loginId", async () => {
    const user = await createTestUser({
      email: "login-id@test.com",
      loginId: "adm001",
    });

    const response = await app.handle(
      new Request("http://localhost/auth/login-id", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "adm001",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.access_token).toBeDefined();
    expect(body.data.refresh_token).toBeDefined();
    expect(body.data.user.id).toBe(user.id);
    expect(body.data.user.loginId).toBe("adm001");
    expect(body.data.user.email).toBe("login-id@test.com");
  });

  it("should return 401 for incorrect password", async () => {
    await createTestUser({
      loginId: "wrong-pass-id",
      email: "wrong-pass-id@test.com",
    });

    const response = await app.handle(
      new Request("http://localhost/auth/login-id", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "wrong-pass-id",
          password: "wrong_password",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should return 401 for non-existent loginId", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login-id", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "ghost-user",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("should return 403 for disabled account", async () => {
    await createTestUser({
      loginId: "disabled-id",
      email: "disabled-id@test.com",
      isActive: false,
    });

    const response = await app.handle(
      new Request("http://localhost/auth/login-id", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "disabled-id",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("should return 400 when loginId is empty", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login-id", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should set refresh_token cookie after successful login", async () => {
    await createTestUser({
      email: "cookie-login-id@test.com",
      loginId: "cookie-id",
    });

    const response = await app.handle(
      new Request("http://localhost/auth/login-id", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          loginId: "cookie-id",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toContain("refresh_token=");
    expect(setCookieHeader).toContain("HttpOnly");
  });
});
