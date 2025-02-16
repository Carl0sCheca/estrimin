/*
  Warnings:

  - You are about to drop the `registrationLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "registrationLink";

-- CreateTable
CREATE TABLE "registrationCodes" (
    "id" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),

    CONSTRAINT "registrationCodes_pkey" PRIMARY KEY ("id")
);
