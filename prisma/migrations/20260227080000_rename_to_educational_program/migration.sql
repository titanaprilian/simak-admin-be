-- Rename table and column
ALTER TABLE "ProgramPendidikan" RENAME TO "EducationalProgram";
ALTER TABLE "EducationalProgram" RENAME COLUMN "jenjang" TO "level";

-- Drop old unique constraint and create new one
DROP INDEX IF EXISTS "ProgramPendidikan_name_jenjang_key";
CREATE UNIQUE INDEX "EducationalProgram_name_level_key" ON "EducationalProgram"("name", "level");
