import { describe, it, expect } from "bun:test";
import { app } from "@/server";

describe("Health check", () => {
  it("GET /health should be public", async () => {
    const res = await app.handle(new Request("http://localhost/health"));

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe("ok");
  });
});
