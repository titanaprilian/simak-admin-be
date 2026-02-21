import { t } from "@/libs/i18n";

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
