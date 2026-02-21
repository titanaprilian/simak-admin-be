import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/libs/prisma";
import { AuthService } from "@/modules/auth/service";
import { createTestUser, resetDatabase } from "../test_utils";

describe("Cron Job: Prune Expired Tokens", () => {
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: console.error,
    debug: () => {},
  } as any;

  beforeEach(() => {
    resetDatabase();
  });

  it("should delete EXPIRED tokens but keep VALID tokens", async () => {
    const user = await createTestUser();

    const validToken = await prisma.refreshToken.create({
      data: {
        token: "valid-token-123",
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const expiredToken = await prisma.refreshToken.create({
      data: {
        token: "expired-token-456",
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    });

    await AuthService.pruneExpiredTokens(mockLogger);

    const checkValid = await prisma.refreshToken.findUnique({
      where: { id: validToken.id },
    });
    expect(checkValid).not.toBeNull();

    const checkExpired = await prisma.refreshToken.findUnique({
      where: { id: expiredToken.id },
    });
    expect(checkExpired).toBeNull();
  });
});
