export class InvalidPositionAssignmentError extends Error {
  readonly key: string;

  constructor(key: string = "position.invalidAssignment") {
    super(key);
    this.key = key;
    this.name = "InvalidPositionAssignmentError";
  }
}

export class SingleSeatOccupiedError extends Error {
  readonly key: string;

  constructor() {
    super("position.singleSeatOccupied");
    this.key = "position.singleSeatOccupied";
    this.name = "SingleSeatOccupiedError";
  }
}
