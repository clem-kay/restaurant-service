/*
  Warnings:

  - Made the column `sessionId` on table `OrderSessionId` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrderSessionId" ALTER COLUMN "sessionId" SET NOT NULL;
