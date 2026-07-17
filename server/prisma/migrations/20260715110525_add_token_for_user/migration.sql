/*
  Warnings:

  - A unique constraint covering the columns `[email_verify_token_hash]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verify_token_expires" TIMESTAMPTZ(6),
ADD COLUMN     "email_verify_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verify_token_hash_key" ON "users"("email_verify_token_hash");
