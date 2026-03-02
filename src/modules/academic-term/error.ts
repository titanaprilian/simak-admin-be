import { t } from "@/libs/i18n";

export class AcademicTermNotFoundError extends Error {
  readonly key = "academicTerm.notFound";
  constructor(locale: string = "en") {
    super(t(locale, "academicTerm.notFound"));
  }
}

export class InvalidDateRangeError extends Error {
  readonly key = "academicTerm.invalidDate";
  constructor(locale: string = "en") {
    super(t(locale, "academicTerm.invalidDate"));
  }
}
