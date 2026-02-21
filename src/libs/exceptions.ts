import { t } from "@/libs/i18n";

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
