export class StudyProgramNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Study program not found");
    this.name = "StudyProgramNotFoundError";
    this.key = "studyProgram.notFound";
  }
}

export class FacultyNotFoundError extends Error {
  constructor() {
    super("Faculty not found");
    this.name = "FacultyNotFoundError";
  }
}

export class StudyProgramCodeExistsError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super("Code already exists for this faculty");
    this.name = "StudyProgramCodeExistsError";
    this.key = "studyProgram.codeExists";
  }
}
