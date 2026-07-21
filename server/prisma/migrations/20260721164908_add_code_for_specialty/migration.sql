/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `specialties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `specialties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "specialties" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "specialties"("code");
