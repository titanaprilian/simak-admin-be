export class StudyProgramNotFoundError extends Error {
  constructor() {
    super("Study program not found");
    this.name = "StudyProgramNotFoundError";
  }
}

export class FacultyNotFoundError extends Error {
  constructor() {
    super("Faculty not found");
    this.name = "FacultyNotFoundError";
  }
}
