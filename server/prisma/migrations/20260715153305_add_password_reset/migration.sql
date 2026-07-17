/*
  Warnings:

  - A unique constraint covering the columns `[password_reset_token_hash]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_reset_token_expires" TIMESTAMPTZ(6),
ADD COLUMN     "password_reset_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_password_reset_token_hash_key" ON "users"("password_reset_token_hash");
