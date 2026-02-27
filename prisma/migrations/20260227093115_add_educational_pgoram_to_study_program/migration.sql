-- AlterTable
ALTER TABLE "EducationalProgram" RENAME CONSTRAINT "ProgramPendidikan_pkey" TO "EducationalProgram_pkey";

-- AlterTable
ALTER TABLE "StudyProgram" ADD COLUMN     "educationalProgramId" TEXT;

-- CreateIndex
CREATE INDEX "StudyProgram_educationalProgramId_idx" ON "StudyProgram"("educationalProgramId");

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_educationalProgramId_fkey" FOREIGN KEY ("educationalProgramId") REFERENCES "EducationalProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
