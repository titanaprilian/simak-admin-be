/*
  Warnings:

  - A unique constraint covering the columns `[termOrder]` on the table `AcademicTerm` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_termOrder_key" ON "AcademicTerm"("termOrder");
