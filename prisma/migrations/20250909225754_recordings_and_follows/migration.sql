/*
  Warnings:

  - You are about to drop the column `watchOnly` on the `channel` table. All the data in the column will be lost.
  - You are about to drop the column `watchOnlyPassword` on the `channel` table. All the data in the column will be lost.
  - You are about to drop the `registrationCodes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `setting` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ChannelVisibility" AS ENUM ('ALL', 'REGISTERED_USERS', 'ALLOWLIST', 'PASSWORD', 'UNLISTED');

-- CreateEnum
CREATE TYPE "public"."RecordingVisibility" AS ENUM ('PUBLIC', 'ALLOWLIST', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."RecordingQueueState" AS ENUM ('PENDING', 'ENCODING', 'ENCODED', 'MERGING', 'MERGED', 'COMPLETED', 'FAILED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "public"."registrationCodes" DROP CONSTRAINT "registrationCodes_usedById_fkey";

-- AlterTable
ALTER TABLE "public"."channel" DROP COLUMN "watchOnly",
DROP COLUMN "watchOnlyPassword",
ADD COLUMN     "visibility" "public"."ChannelVisibility" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "visibilityPassword" TEXT;

-- DropTable
DROP TABLE "public"."registrationCodes";

-- DropTable
DROP TABLE "public"."setting";

-- DropEnum
DROP TYPE "public"."ChannelWatchOnly";

-- CreateTable
CREATE TABLE "public"."registrationCode" (
    "id" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "registrationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recordingSaved" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visibility" "public"."RecordingVisibility" NOT NULL DEFAULT 'PUBLIC',
    "title" VARCHAR(255),

    CONSTRAINT "recordingSaved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."siteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "siteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."userSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "userSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."recordingQueue" (
    "id" SERIAL NOT NULL,
    "status" "public"."RecordingQueueState" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "firstSegmentId" INTEGER,
    "visibility" "public"."RecordingVisibility" NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "recordingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."userFollows" (
    "userId" TEXT NOT NULL,
    "followId" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "userSetting_key_userId_idx" ON "public"."userSetting"("key", "userId");

-- CreateIndex
CREATE INDEX "recordingQueue_status_idx" ON "public"."recordingQueue"("status");

-- CreateIndex
CREATE INDEX "recordingQueue_userId_idx" ON "public"."recordingQueue"("userId");

-- CreateIndex
CREATE INDEX "userFollows_userId_idx" ON "public"."userFollows"("userId");

-- CreateIndex
CREATE INDEX "userFollows_followId_idx" ON "public"."userFollows"("followId");

-- CreateIndex
CREATE UNIQUE INDEX "userFollows_userId_followId_key" ON "public"."userFollows"("userId", "followId");

-- AddForeignKey
ALTER TABLE "public"."registrationCode" ADD CONSTRAINT "registrationCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recordingSaved" ADD CONSTRAINT "recordingSaved_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."channel"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userSetting" ADD CONSTRAINT "userSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recordingQueue" ADD CONSTRAINT "recordingQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recordingQueue" ADD CONSTRAINT "recordingQueue_firstSegmentId_fkey" FOREIGN KEY ("firstSegmentId") REFERENCES "public"."recordingQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userFollows" ADD CONSTRAINT "userFollows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userFollows" ADD CONSTRAINT "userFollows_followId_fkey" FOREIGN KEY ("followId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
