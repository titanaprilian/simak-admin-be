-- CreateTable
CREATE TABLE "ProgramPendidikan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramPendidikan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgramPendidikan_name_jenjang_key" ON "ProgramPendidikan"("name", "jenjang");
