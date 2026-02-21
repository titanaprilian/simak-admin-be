import { prisma } from "@/libs/prisma";
import type { LoginInput } from "./schema";
import { AccountDisabledError, UnauthorizedError } from "@libs/exceptions";
import { parseDuration } from "@/utils/time";
import { env } from "@/config/env";
import type { Logger } from "pino";

export abstract class AuthService {
  static async login(data: LoginInput, log: Logger, locale: string = "en") {
    const email = data.email.toLowerCase();
    log.debug({ email }, "Login attempt initiated");

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      log.warn({ email }, "Login failed: User not found");
      return null;
    }

    const valid = await Bun.password.verify(data.password, user.password);
    if (!valid) {
      log.warn({ email }, "Login failed: Invalid password");
      return null;
    }

    if (!user.isActive) {
      log.warn({ email }, "Login failed: Account disabled");
      throw new AccountDisabledError(locale);
    }

    log.info({ userId: user.id, email }, "User logged in successfully");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tokenVersion: user.tokenVersion,
    };
  }

  static async createRefreshToken(userId: string) {
    const tokenId = crypto.randomUUID();
    const expiresIn = parseDuration(env.JWT_REFRESH_EXPIRES_IN || "7d");

    await prisma.refreshToken.create({
      data: {
        token: tokenId,
        userId: userId,
        expiresAt: new Date(Date.now() + expiresIn),
      },
    });

    return tokenId;
  }

  static async refresh({
    userId,
    tokenVersion,
    refreshToken,
    log,
    locale = "en",
  }: {
    userId: string;
    tokenVersion: number;
    refreshToken: string;
    log: Logger;
    locale?: string;
  }) {
    log.debug({ userId }, "Refresh token flow initiated");

    // Find refresh token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!storedToken) {
      // This might be a client bug or a brute-force attempt
      log.warn({ userId }, "Refresh failed: Token not found in DB");
      throw new UnauthorizedError(locale, "auth.refreshFailed");
    }

    // Reuse detection
    if (storedToken.revoked) {
      // This is the most critical log. It means someone is trying to use a dead token.
      // We log this as ERROR so it pops up in monitoring tools immediately.
      log.error(
        { userId, tokenId: storedToken.id },
        "SECURITY ALERT: Reuse detection triggered. Nuking all user sessions.",
      );

      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { userId },
          data: { revoked: true },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { tokenVersion: { increment: 1 } },
        }),
      ]);

      throw new UnauthorizedError(locale, "auth.tokenBlacklisted");
    }

    // Expiration check
    if (storedToken.expiresAt < new Date()) {
      // Common operational noise, but good to track if clients aren't refreshing in time
      log.warn(
        { userId, tokenId: storedToken.id, expiresAt: storedToken.expiresAt },
        "Refresh failed: Token expired",
      );
      throw new UnauthorizedError(locale, "auth.refreshFailed");
    }
    const user = storedToken.user;

    // User validation
    if (!user.isActive) {
      log.warn({ userId }, "Refresh failed: Account is disabled");
      throw new AccountDisabledError(locale);
    }

    if (user.tokenVersion !== tokenVersion) {
      log.warn(
        {
          userId,
          userVersion: user.tokenVersion,
          tokenVersion: tokenVersion,
        },
        "Refresh failed: Version mismatch (Password changed or Logout All)",
      );
      throw new UnauthorizedError(locale, "auth.invalidToken");
    }

    // Rotate refresh token and calculate duration
    const newRefreshToken = crypto.randomUUID();
    const refreshDuration = parseDuration(env.JWT_REFRESH_EXPIRES_IN || "7d");

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + refreshDuration),
        },
      }),
    ]);

    // Confirms the session was successfully extended
    log.info(
      { userId, tokenId: storedToken.id },
      "Session refreshed successfully",
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      refreshToken: newRefreshToken,
      tokenVersion: user.tokenVersion,
    };
  }

  static async logout({
    refreshToken,
    userId,
    log,
  }: {
    refreshToken: string;
    userId: string;
    log: Logger;
  }) {
    log.debug({ userId }, "Logout flow initiated");

    const token = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!token) {
      // Not an error, maybe the client cleaned up locally or it's an old token.
      log.info({ userId }, "Logout ignored: Token not found in DB");
      return;
    }

    if (token.userId !== userId) {
      // The user (via Access Token) is trying to kill a Refresh Token that isn't theirs.
      // Could be a bug or someone messing with the API.
      log.warn(
        { userId, tokenOwnerId: token.userId, tokenId: token.id },
        "Logout failed: specific refresh token does not belong to user",
      );
      return;
    }

    if (token.revoked) {
      // Idempotency check. No need to spam 'info' logs for this.
      log.debug(
        { userId, tokenId: token.id },
        "Logout ignored: Token already revoked",
      );
      return;
    }

    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { revoked: true },
    });

    log.info({ userId, tokenId: token.id }, "User logged out (token revoked)");
  }

  static async logoutAll({
    userId,
    requestingTokenId,
    log,
    locale = "en",
  }: {
    userId: string;
    requestingTokenId: string;
    log: Logger;
    locale?: string;
  }) {
    log.info({ userId }, "Logout-All initiated (Revoking all sessions)");

    const requestingToken = await prisma.refreshToken.findUnique({
      where: { token: requestingTokenId },
      include: { user: true },
    });

    if (!requestingToken || requestingToken.revoked) {
      log.warn(
        { userId, tokenId: requestingTokenId },
        "Logout-All blocked: Initiating token is revoked or invalid",
      );
      throw new UnauthorizedError(locale, "auth.invalidToken");
    }

    const [revokedBatch] = await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);

    // Logging the count helps you see if a user had 1 active session or 50 (suspicious).
    log.info(
      { userId, revokedCount: revokedBatch.count },
      "Logout-All completed successfully",
    );
  }

  static async me(userId: string, log: Logger, locale: string = "en") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      log.warn(
        { userId },
        "Profile fetch failed: User ID from token not found in DB",
      );

      throw new UnauthorizedError(locale, "auth.invalidToken");
    }

    log.debug({ userId }, "User profile fetched");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleName: user.role.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static async pruneExpiredTokens(log: Logger) {
    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (count > 0) {
        log.info({ count }, "🗑️ Pruned expired refresh tokens");
      } else {
        log.debug("No expired tokens to prune");
      }
    } catch (error) {
      log.error({ err: error }, "❌ Failed to prune expired tokens");
    }
  }
}
