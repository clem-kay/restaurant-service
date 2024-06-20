/*
  Warnings:

  - Added the required column `categoryId` to the `FoodMenu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FoodMenu" ADD COLUMN     "categoryId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "FoodCategory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FoodCategory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FoodMenu" ADD CONSTRAINT "FoodMenu_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
