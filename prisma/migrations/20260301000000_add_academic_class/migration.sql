-- CreateTable
CREATE TABLE "AcademicClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "studyProgramId" TEXT NOT NULL,
    "enrollmentYear" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "advisorLecturerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcademicClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClass_studyProgramId_enrollmentYear_name_key" ON "AcademicClass"("studyProgramId", "enrollmentYear", "name");

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_advisorLecturerId_fkey" FOREIGN KEY ("advisorLecturerId") REFERENCES "Lecturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_educationalProgramId_fkey" FOREIGN KEY ("educationalProgramId") REFERENCES "EducationalProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddIndex
CREATE UNIQUE INDEX "StudyProgram_code_facultyId_key" ON "StudyProgram"("code", "facultyId");
