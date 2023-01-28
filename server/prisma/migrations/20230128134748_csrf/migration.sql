/*
  Warnings:

  - Added the required column `csrf` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
DELETE FROM "Session";

ALTER TABLE "Session" ADD COLUMN     "csrf" TEXT NOT NULL;

