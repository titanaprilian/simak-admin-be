export class LoginIdExistsError extends Error {
  readonly key: string;
  readonly loginId: string;

  constructor(loginId: string, locale: string = "en") {
    super(`Login ID ${loginId} already exists`);
    this.name = "LoginIdExistsError";
    this.key = "userStudents.loginIdExists";
    this.loginId = loginId;
  }
}

export class EmailExistsError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Email already exists");
    this.name = "EmailExistsError";
    this.key = "userStudents.emailExists";
  }
}

export class StudentAlreadyExistsError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Student already exists");
    this.name = "StudentAlreadyExistsError";
    this.key = "userStudents.alreadyExists";
  }
}

export class StudentNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Student not found");
    this.name = "StudentNotFoundError";
    this.key = "userStudents.notFound";
  }
}

export class DeleteSelfStudentError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("You cannot delete your own account");
    this.name = "DeleteSelfStudentError";
    this.key = "userStudents.deleteSelf";
  }
}

export class MahasiswaRoleNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Mahasiswa role not found. Please contact administrator.");
    this.name = "MahasiswaRoleNotFoundError";
    this.key = "userStudents.mahasiswaRoleNotFound";
  }
}

export class EnrollmentYearNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Enrollment year not found. Please contact administrator.");
    this.name = "EnrollmentYearNotFoundError";
    this.key = "userStudents.enrollmentYearNotFound";
  }
}
