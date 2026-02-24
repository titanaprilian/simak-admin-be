export class FacultyNotFoundError extends Error {
  constructor() {
    super("Faculty not found");
    this.name = "FacultyNotFoundError";
  }
}

export class FacultyHasRelatedRecordsError extends Error {
  readonly key: string;

  constructor() {
    super("faculty.hasRelatedRecords");
    this.key = "faculty.hasRelatedRecords";
    this.name = "FacultyHasRelatedRecordsError";
  }
}
