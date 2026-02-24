import { t } from "@/libs/i18n";
import type { Logger } from "pino";

export function handlePrismaError(error: unknown, log: Logger): never {
  const prismaError = error as {
    code?: string;
    meta?: Record<string, unknown>;
  };

  if (prismaError.code) {
    log.warn(
      { code: prismaError.code, meta: prismaError.meta },
      "Prisma error occurred",
    );

    if (prismaError.code === "P2003") {
      const rawField = (prismaError.meta?.field_name as string) || "unknown";
      const match = rawField.match(/_([a-zA-Z0-9]+)_fkey/);
      const fieldName = match ? match[1] : rawField;
      throw new ForeignKeyError(fieldName);
    }

    if (prismaError.code === "P2002") {
      const target =
        (prismaError.meta?.target as string[])?.join(", ") || "field";
      throw new UniqueConstraintError(target);
    }

    if (prismaError.code === "P2025") {
      throw new RecordNotFoundError();
    }
  }
  log.error({ error }, "Unexpected error in service layer");
  throw error;
}

export class AccountDisabledError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "auth.accountDisabled"));
    this.key = "auth.accountDisabled";
  }
}

export class UnauthorizedError extends Error {
  readonly key: string;

  constructor(locale: string = "en", key: string = "common.unauthorized") {
    super(t(locale, key));
    this.key = key;
  }
}

export class ForeignKeyError extends Error {
  readonly key: string;
  readonly field: string;

  constructor(field: string = "unknown", locale: string = "en") {
    super(t(locale, "common.invalidReference", { field }));
    this.key = "common.invalidReference";
    this.field = field;
  }
}

export class UniqueConstraintError extends Error {
  readonly key: string;
  readonly field: string;

  constructor(target: string = "field", locale: string = "en") {
    super(t(locale, "common.duplicate", { field: target }));
    this.key = "common.duplicate";
    this.field = target;
  }
}

export class RecordNotFoundError extends Error {
  readonly key: string;

  constructor(message?: string) {
    super(message || t("en", "common.notFound"));
    this.key = "common.notFound";
  }
}
