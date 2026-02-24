/*
  Warnings:

  - You are about to drop the column `error` on the `recordingQueue` table. All the data in the column will be lost.
  - The primary key for the `userSetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[mergingWithId]` on the table `recordingQueue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,fileName]` on the table `recordingQueue` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecordingQueueState" ADD VALUE 'RECORDING';
ALTER TYPE "RecordingQueueState" ADD VALUE 'RECORDED';
ALTER TYPE "RecordingQueueState" ADD VALUE 'ENCODED_UPLOADING';
ALTER TYPE "RecordingQueueState" ADD VALUE 'MERGING_UPLOADING';

-- DropIndex
DROP INDEX "userSetting_key_userId_idx";

-- AlterTable
ALTER TABLE "recordingQueue" DROP COLUMN "error",
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "errorState" "RecordingQueueState",
ADD COLUMN     "mergingWithId" INTEGER,
ADD COLUMN     "segmentsIndex" INTEGER[],
ALTER COLUMN "status" SET DEFAULT 'RECORDING';

-- AlterTable
ALTER TABLE "userSetting" DROP CONSTRAINT "userSetting_pkey",
ADD CONSTRAINT "userSetting_pkey" PRIMARY KEY ("userId", "key");

-- CreateTable
CREATE TABLE "channelStatus" (
    "channelId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastOnline" TIMESTAMP(3),
    "firstSegmentId" INTEGER,
    "segmentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "channelStatus_pkey" PRIMARY KEY ("channelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "channelStatus_userId_key" ON "channelStatus"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recordingQueue_mergingWithId_key" ON "recordingQueue"("mergingWithId");

-- CreateIndex
CREATE UNIQUE INDEX "recordingQueue_userId_fileName_key" ON "recordingQueue"("userId", "fileName");

-- AddForeignKey
ALTER TABLE "channelStatus" ADD CONSTRAINT "channelStatus_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordingQueue" ADD CONSTRAINT "recordingQueue_mergingWithId_fkey" FOREIGN KEY ("mergingWithId") REFERENCES "recordingQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
