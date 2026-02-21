import { describe, it, expect, afterAll } from "bun:test";
import { app } from "@/server";
import { prisma } from "@/libs/prisma";

describe("GET /health - Health check with i18n", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return English message in English", async () => {
    const response = await app.handle(
      new Request("http://localhost/health", {
        method: "GET",
        headers: {
          "accept-language": "en",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Server up and running");
  });

  it("should return Spanish message in Spanish", async () => {
    const response = await app.handle(
      new Request("http://localhost/health", {
        method: "GET",
        headers: {
          "accept-language": "es",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Servidor en funcionamiento");
  });

  it("should return Indonesian message in Indonesian", async () => {
    const response = await app.handle(
      new Request("http://localhost/health", {
        method: "GET",
        headers: {
          "accept-language": "id",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toBe("Server berjalan");
  });
});
