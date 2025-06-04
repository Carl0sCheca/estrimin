/*
  Warnings:

  - You are about to drop the `registrationCodes` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RecordingWatchOnly" AS ENUM ('PUBLIC', 'ALLOWLIST', 'PRIVATE');

-- DropForeignKey
ALTER TABLE "registrationCodes" DROP CONSTRAINT "registrationCodes_usedById_fkey";

-- DropTable
DROP TABLE "registrationCodes";

-- CreateTable
CREATE TABLE "registrationCode" (
    "id" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "registrationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordingSaved" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visibility" "RecordingWatchOnly" NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "recordingSaved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordingClip" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "channelId" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "private" "RecordingWatchOnly" NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "recordingClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "userSetting_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "registrationCode" ADD CONSTRAINT "registrationCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordingSaved" ADD CONSTRAINT "recordingSaved_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordingClip" ADD CONSTRAINT "recordingClip_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordingClip" ADD CONSTRAINT "recordingClip_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSetting" ADD CONSTRAINT "userSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
