/*
  Warnings:

  - Made the column `educationalProgramId` on table `StudyProgram` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "StudyProgram" DROP CONSTRAINT "StudyProgram_educationalProgramId_fkey";

-- AlterTable
ALTER TABLE "StudyProgram" ALTER COLUMN "educationalProgramId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_educationalProgramId_fkey" FOREIGN KEY ("educationalProgramId") REFERENCES "EducationalProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
