-- AlterEnum
ALTER TYPE "Gender" ADD VALUE 'UNKNOWN';

-- AlterTable
ALTER TABLE "patients" ALTER COLUMN "gender" SET DEFAULT 'UNKNOWN';
