-- DropForeignKey
ALTER TABLE "FoodMenu" DROP CONSTRAINT "FoodMenu_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "FoodMenu" ADD CONSTRAINT "FoodMenu_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
