import { t } from "@/libs/i18n";

export class AcademicClassNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "academicClass.notFound"));
    this.key = "academicClass.notFound";
  }
}

export class DuplicateAcademicClassError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "academicClass.duplicate"));
    this.key = "academicClass.duplicate";
  }
}

export class StudyProgramNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "academicClass.studyProgramNotFound"));
    this.key = "academicClass.studyProgramNotFound";
  }
}

export class LecturerNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "academicClass.lecturerNotFound"));
    this.key = "academicClass.lecturerNotFound";
  }
}
