export class UserPositionNotFoundError extends Error {
  key = "userPositions.notFound";

  constructor() {
    super("User position not found");
    this.name = "UserPositionNotFoundError";
  }
}

export class PositionAssignmentValidationError extends Error {
  key = "userPositions.invalidAssignment";

  constructor(message: string) {
    super(message);
    this.name = "PositionAssignmentValidationError";
  }
}

export class CreateSuperAdminError extends Error {
  key = "userPositions.createSuperAdmin";

  constructor() {
    super("Cannot create SuperAdmin user");
    this.name = "CreateSuperAdminError";
  }
}

export class UpdateSuperAdminError extends Error {
  key = "userPositions.updateSuperAdmin";

  constructor() {
    super("Cannot assign SuperAdmin role");
    this.name = "UpdateSuperAdminError";
  }
}

export class DeactivateSuperAdminError extends Error {
  key = "userPositions.deactivateSuperAdmin";

  constructor() {
    super("Cannot deactivate SuperAdmin user");
    this.name = "DeactivateSuperAdminError";
  }
}
