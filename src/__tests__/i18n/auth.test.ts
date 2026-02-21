import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";
import {
  createTestUser,
  resetDatabase,
  randomIp,
  createAuthenticatedUser,
  createTestRoleWithPermissions,
} from "../test_utils";

describe("POST /auth/login - Login i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return English message when Accept-Language is en", async () => {
    await createTestUser({ email: "i18n@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "en",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Invalid email or password");
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    await createTestUser({ email: "i18n@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Email o contraseña inválidos");
  });

  it("should return Indonesian message when Accept-Language is id", async () => {
    await createTestUser({ email: "i18n@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "id",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Email atau kata sandi tidak valid");
  });

  it("should return English message by default when no Accept-Language header", async () => {
    await createTestUser({ email: "i18n@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Invalid email or password");
  });

  it("should return Spanish message when Accept-Language is es-ES", async () => {
    await createTestUser({ email: "i18n@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es-ES",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Email o contraseña inválidos");
  });

  it("should return Indonesian message when Accept-Language is id-ID", async () => {
    await createTestUser({ email: "i18n@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "id-ID",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Email atau kata sandi tidak valid");
  });
});

describe("POST /auth/login - Successful login i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English success message in English", async () => {
    await createTestUser({ email: "i18n@test.com", password: "password123" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "en",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("User login successfully");
  });

  it("should return Spanish success message in Spanish", async () => {
    await createTestUser({ email: "i18n@test.com", password: "password123" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Inicio de sesión exitoso");
  });

  it("should return Indonesian success message in Indonesian", async () => {
    await createTestUser({ email: "i18n@test.com", password: "password123" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "id",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "i18n@test.com",
          password: "password123",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Login berhasil");
  });
});

describe("POST /auth/refresh - Token refresh i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when refreshing token in English", async () => {
    await createTestUser({
      email: "refresh@test.com",
      password: "password123",
    });

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
    const refreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Token refreshed successfully");
  });

  it("should return Spanish message when refreshing token in Spanish", async () => {
    await createTestUser({
      email: "refresh@test.com",
      password: "password123",
    });

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
    const refreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Token actualizado exitosamente");
  });

  it("should return Indonesian message when refreshing token in Indonesian", async () => {
    await createTestUser({
      email: "refresh@test.com",
      password: "password123",
    });

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
    const refreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Token berhasil diperbarui");
  });

  it("should return English message for invalid token in English", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          refresh_token: "invalid-token",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Invalid or expired refresh token");
  });

  it("should return Spanish message for invalid token in Spanish", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          refresh_token: "invalid-token",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Token de actualización inválido o expirado");
  });

  it("should return Indonesian message for invalid token in Indonesian", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          refresh_token: "invalid-token",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Token penyegaran tidak valid atau kedaluwarsa");
  });
});

describe("POST /auth/logout - Logout i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when logging out in English", async () => {
    await createTestUser({ email: "logout@test.com", password: "password123" });

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
    const loginBody = await loginRes.json();
    const refreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "en",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Logged out successfully");
  });

  it("should return Spanish message when logging out in Spanish", async () => {
    await createTestUser({ email: "logout@test.com", password: "password123" });

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
    const loginBody = await loginRes.json();
    const refreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Cierre de sesión exitoso");
  });

  it("should return Indonesian message when logging out in Indonesian", async () => {
    await createTestUser({ email: "logout@test.com", password: "password123" });

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
    const loginBody = await loginRes.json();
    const refreshToken = loginBody.data.refresh_token;

    const response = await app.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "id",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Logout berhasil");
  });
});

describe("GET /auth/me - Get current user i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return English message when getting me in English", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("User details retrieved");
  });

  it("should return Spanish message when getting me in Spanish", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Usuario obtenido exitosamente");
  });

  it("should return Indonesian message when getting me in Indonesian", async () => {
    const { authHeaders } = await createAuthenticatedUser();
    await createTestRoleWithPermissions("TestUser", [
      { featureName: "user_management", action: "read" },
    ]);

    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        method: "GET",
        headers: {
          ...authHeaders,
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Pengguna berhasil diambil");
  });
});
