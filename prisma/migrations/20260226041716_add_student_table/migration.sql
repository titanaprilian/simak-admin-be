-- CreateEnum
CREATE TYPE "StatusMhs" AS ENUM ('tidak_aktif', 'belum_program', 'belum_daftar_ulang', 'sudah_program');

-- CreateEnum
CREATE TYPE "JenisMhs" AS ENUM ('reguler', 'reguler_transfer');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "year_of_entry" INTEGER NOT NULL,
    "birth_year" INTEGER NOT NULL,
    "address" TEXT,
    "statusMhs" "StatusMhs" NOT NULL DEFAULT 'belum_program',
    "kelas" TEXT,
    "jenis" "JenisMhs" NOT NULL DEFAULT 'reguler',
    "city_birth" TEXT,
    "phone_number" TEXT,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "studyProgramId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_studyProgramId_idx" ON "Student"("studyProgramId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
