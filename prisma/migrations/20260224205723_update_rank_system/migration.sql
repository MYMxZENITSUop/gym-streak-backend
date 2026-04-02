/*
  Warnings:

  - You are about to drop the column `levelNumber` on the `Rank` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Rank" DROP COLUMN "levelNumber",
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;
