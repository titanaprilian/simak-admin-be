export class FacultyNotFoundError extends Error {
  constructor() {
    super("Faculty not found");
    this.name = "FacultyNotFoundError";
  }
}
