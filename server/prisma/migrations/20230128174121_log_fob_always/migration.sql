/*
  Warnings:

  - Made the column `fob` on table `Log` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
DELETE FROM "Log" WHERE "fob" IS NULL;

ALTER TABLE "Log" ALTER COLUMN "fob" SET NOT NULL;
