/*
  Warnings:

  - You are about to drop the column `watchOnly` on the `channel` table. All the data in the column will be lost.
  - You are about to drop the column `watchOnlyPassword` on the `channel` table. All the data in the column will be lost.
  - You are about to drop the `registrationCodes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `setting` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChannelVisibility" AS ENUM ('ALL', 'REGISTERED_USERS', 'ALLOWLIST', 'PASSWORD');

-- CreateEnum
CREATE TYPE "RecordingVisibility" AS ENUM ('PUBLIC', 'ALLOWLIST', 'UNLISTED', 'PRIVATE');

-- DropForeignKey
ALTER TABLE "registrationCodes" DROP CONSTRAINT "registrationCodes_usedById_fkey";

-- AlterTable
ALTER TABLE "channel" DROP COLUMN "watchOnly",
DROP COLUMN "watchOnlyPassword",
ADD COLUMN     "visibility" "ChannelVisibility" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "visibilityPassword" TEXT;

-- DropTable
DROP TABLE "registrationCodes";

-- DropTable
DROP TABLE "setting";

-- DropEnum
DROP TYPE "ChannelWatchOnly";

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
    "visibility" "RecordingVisibility" NOT NULL DEFAULT 'PUBLIC',
    "title" TEXT,

    CONSTRAINT "recordingSaved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordingClip" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "channelId" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "private" "RecordingVisibility" NOT NULL DEFAULT 'PUBLIC',
    "title" TEXT,

    CONSTRAINT "recordingClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "siteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "userSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "userSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "userSetting_key_userId_idx" ON "userSetting"("key", "userId");

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
