import { prisma } from "@/libs/prisma";
import { AccountDisabledError, UnauthorizedError } from "@libs/exceptions";
import { accessJwt } from "@/plugins/jwt";
import { Elysia } from "elysia";
import { getLocale } from "@/libs/i18n";

export const authMiddleware = new Elysia()
  .use(accessJwt)
  .derive(async ({ headers, accessJwt }) => {
    const locale = getLocale(headers["accept-language"]);
    const auth = headers.authorization;

    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedError(locale);
    }

    const token = auth.slice(7);
    const payload = await accessJwt.verify(token);

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      typeof payload.tv !== "number"
    ) {
      throw new UnauthorizedError(locale);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError(locale);
    }

    if (!user.isActive) {
      throw new AccountDisabledError(locale);
    }

    if (user.tokenVersion !== payload.tv) {
      throw new UnauthorizedError(locale);
    }

    return {
      user: {
        id: payload.sub,
        tokenVersion: payload.tv,
      },
    };
  })
  .as("scoped");
