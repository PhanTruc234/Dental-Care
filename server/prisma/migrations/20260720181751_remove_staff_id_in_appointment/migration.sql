/*
  Warnings:

  - You are about to drop the column `staffStaffId` on the `appointments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_staffStaffId_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "staffStaffId";
