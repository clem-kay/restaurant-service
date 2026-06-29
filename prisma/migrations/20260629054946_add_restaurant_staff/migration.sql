-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'RESTAURANT_STAFF';

-- AlterTable
ALTER TABLE "UserAccount" ADD COLUMN     "managedRestaurantId" INTEGER;

-- CreateIndex
CREATE INDEX "UserAccount_managedRestaurantId_idx" ON "UserAccount"("managedRestaurantId");

-- AddForeignKey
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_managedRestaurantId_fkey" FOREIGN KEY ("managedRestaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
