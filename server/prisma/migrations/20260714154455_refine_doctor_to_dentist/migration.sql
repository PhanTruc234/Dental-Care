/*
  Warnings:

  - You are about to drop the column `doctor_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `treatment_records` table. All the data in the column will be lost.
  - Added the required column `dentist_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dentist_id` to the `treatment_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "treatment_records" DROP CONSTRAINT "treatment_records_doctor_id_fkey";

-- DropIndex
DROP INDEX "appointments_doctor_id_scheduled_at_idx";

-- DropIndex
DROP INDEX "treatment_records_doctor_id_treated_at_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "doctor_id",
ADD COLUMN     "dentist_id" UUID NOT NULL,
ADD COLUMN     "staffStaffId" UUID;

-- AlterTable
ALTER TABLE "treatment_records" DROP COLUMN "doctor_id",
ADD COLUMN     "dentist_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "appointments_dentist_id_scheduled_at_idx" ON "appointments"("dentist_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "treatment_records_dentist_id_treated_at_idx" ON "treatment_records"("dentist_id", "treated_at");

-- AddForeignKey
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staffStaffId_fkey" FOREIGN KEY ("staffStaffId") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;
