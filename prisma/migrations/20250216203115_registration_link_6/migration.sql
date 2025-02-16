/*
  Warnings:

  - Added the required column `usedById` to the `registrationCodes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "registrationCodes" ADD COLUMN     "usedById" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "registrationCodes" ADD CONSTRAINT "registrationCodes_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
