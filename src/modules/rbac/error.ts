import { t } from "@/libs/i18n";

export class DeleteSystemError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "rbac.deleteSystemRole"));
    this.key = "rbac.deleteSystemRole";
  }
}

export class UpdateSystemError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "rbac.updateSystemRole"));
    this.key = "rbac.updateSystemRole";
  }
}

export class InvalidFeatureIdError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "rbac.invalidFeatureId"));
    this.key = "rbac.invalidFeatureId";
  }
}
