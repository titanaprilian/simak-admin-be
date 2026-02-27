export class LecturerNotFoundError extends Error {
  constructor() {
    super("Lecturer not found");
    this.name = "LecturerNotFoundError";
  }
}

export class UserAlreadyHasLecturerError extends Error {
  constructor() {
    super("User already has a lecturer profile");
    this.name = "UserAlreadyHasLecturerError";
  }
}
