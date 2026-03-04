/*
  Warnings:

  - You are about to drop the column `generation` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `kelas` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `statusMhs` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `year_of_entry` on the `Student` table. All the data in the column will be lost.
  - Added the required column `academicClassId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enrollmentTermId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "JenisMhs" ADD VALUE 'reguler_khusus';

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "generation",
DROP COLUMN "kelas",
DROP COLUMN "semester",
DROP COLUMN "statusMhs",
DROP COLUMN "year_of_entry",
ADD COLUMN     "academicClassId" TEXT NOT NULL,
ADD COLUMN     "enrollmentTermId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "StatusMhs";

-- CreateIndex
CREATE INDEX "Student_academicClassId_idx" ON "Student"("academicClassId");

-- CreateIndex
CREATE INDEX "Student_enrollmentTermId_idx" ON "Student"("enrollmentTermId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_academicClassId_fkey" FOREIGN KEY ("academicClassId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_enrollmentTermId_fkey" FOREIGN KEY ("enrollmentTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
