-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('FACULTY', 'STUDY_PROGRAM');

-- CreateTable
CREATE TABLE "Position" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scopeType" "ScopeType" NOT NULL,
  "isSingleSeat" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "facultyId" TEXT,
  "studyProgramId" TEXT,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PositionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");
CREATE INDEX "PositionAssignment_userId_idx" ON "PositionAssignment"("userId");
CREATE INDEX "PositionAssignment_positionId_idx" ON "PositionAssignment"("positionId");
CREATE INDEX "PositionAssignment_facultyId_idx" ON "PositionAssignment"("facultyId");
CREATE INDEX "PositionAssignment_studyProgramId_idx" ON "PositionAssignment"("studyProgramId");

-- AddForeignKey
ALTER TABLE "PositionAssignment"
  ADD CONSTRAINT "PositionAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAssignment"
  ADD CONSTRAINT "PositionAssignment_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PositionAssignment"
  ADD CONSTRAINT "PositionAssignment_facultyId_fkey"
  FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PositionAssignment"
  ADD CONSTRAINT "PositionAssignment_studyProgramId_fkey"
  FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Date window must be valid when endDate exists
ALTER TABLE "PositionAssignment"
  ADD CONSTRAINT "PositionAssignment_date_window_check"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- Scope + single-seat validation
CREATE OR REPLACE FUNCTION validate_position_assignment_scope_and_seat()
RETURNS TRIGGER AS $$
DECLARE
  v_scope "ScopeType";
  v_single_seat BOOLEAN;
BEGIN
  SELECT p."scopeType", p."isSingleSeat"
  INTO v_scope, v_single_seat
  FROM "Position" p
  WHERE p."id" = NEW."positionId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position % not found', NEW."positionId";
  END IF;

  IF v_scope = 'FACULTY' THEN
    IF NEW."facultyId" IS NULL THEN
      RAISE EXCEPTION 'facultyId is required for FACULTY scope';
    END IF;
  END IF;

  IF v_scope = 'STUDY_PROGRAM' THEN
    IF NEW."facultyId" IS NOT NULL THEN
      RAISE EXCEPTION 'facultyId must be null for STUDY_PROGRAM scope';
    END IF;

    IF NEW."studyProgramId" IS NULL THEN
      RAISE EXCEPTION 'studyProgramId is required for STUDY_PROGRAM scope';
    END IF;
  END IF;

  IF NEW."isActive" = true AND v_single_seat = true THEN
    IF v_scope = 'FACULTY' AND EXISTS (
      SELECT 1
      FROM "PositionAssignment" pa
      WHERE pa."positionId" = NEW."positionId"
        AND pa."facultyId" = NEW."facultyId"
        AND pa."isActive" = true
        AND pa."id" <> NEW."id"
    ) THEN
      RAISE EXCEPTION 'Single-seat position already occupied for this faculty';
    END IF;

    IF v_scope = 'STUDY_PROGRAM' AND EXISTS (
      SELECT 1
      FROM "PositionAssignment" pa
      WHERE pa."positionId" = NEW."positionId"
        AND pa."studyProgramId" = NEW."studyProgramId"
        AND pa."isActive" = true
        AND pa."id" <> NEW."id"
    ) THEN
      RAISE EXCEPTION 'Single-seat position already occupied for this study program';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_position_assignment
BEFORE INSERT OR UPDATE ON "PositionAssignment"
FOR EACH ROW
EXECUTE FUNCTION validate_position_assignment_scope_and_seat();
