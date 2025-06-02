-- CreateTable
CREATE TABLE "recordingsSaved" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" INTEGER NOT NULL,

    CONSTRAINT "recordingsSaved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordingsClips" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "channelId" INTEGER NOT NULL,

    CONSTRAINT "recordingsClips_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recordingsSaved" ADD CONSTRAINT "recordingsSaved_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordingsClips" ADD CONSTRAINT "recordingsClips_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordingsClips" ADD CONSTRAINT "recordingsClips_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
