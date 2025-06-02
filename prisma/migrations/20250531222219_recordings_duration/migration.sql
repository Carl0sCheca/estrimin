-- AlterTable
ALTER TABLE "recordingsClips" ADD COLUMN     "duration" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "recordingsSaved" ADD COLUMN     "duration" DOUBLE PRECISION NOT NULL DEFAULT 0;
