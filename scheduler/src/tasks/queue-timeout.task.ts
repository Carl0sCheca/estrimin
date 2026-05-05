import { RecordingQueue } from "@/generated/client";
import { RecordingQueueState } from "@/generated/enums";
import prisma from "@/lib/prisma";
import { deleteFile } from "@scheduler/services/s3.service";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { throwIfJobAborted } from "../jobs/runtime";

const markUploadingRecordingsAsFailed = async (): Promise<
  Array<RecordingQueue>
> => {
  const timeoutDate = new Date(Date.now() - 15 * 60 * 1000);

  const recordingsUploading: Array<RecordingQueue> = await prisma.$queryRaw`
    UPDATE "recordingQueue"
    SET 
      "errorState" = ${RecordingQueueState.UPLOADING},
      "status" = ${RecordingQueueState.FAILED},
      "attempts" = "attempts" + 1,
      "finishedAt" = NOW()
    WHERE 
      "status" = ${RecordingQueueState.UPLOADING}
      AND "startedAt" < ${timeoutDate}
      AND "attempts" < 3
    RETURNING *;
  `;

  return recordingsUploading;
};

const markEncodingRecordingsAsFailed = async (): Promise<
  Array<RecordingQueue>
> => {
  const timeoutDate = new Date(Date.now() - 15 * 60 * 1000);

  const recordingsEncoding: Array<RecordingQueue> = await prisma.$queryRaw`
    UPDATE "recordingQueue"
    SET 
      "errorState" = ${RecordingQueueState.ENCODING},
      "status" = ${RecordingQueueState.FAILED},
      "attempts" = "attempts" + 1,
      "finishedAt" = NOW()
    WHERE
      "status" IN (${RecordingQueueState.ENCODING}, ${RecordingQueueState.ENCODED_UPLOADING})
      AND "startedAt" < ${timeoutDate}
      AND "attempts" < 3
    RETURNING *;
  `;

  return recordingsEncoding;
};

const markMergingRecordingsAsFailed = async (): Promise<
  Array<RecordingQueue>
> => {
  const timeoutDate = new Date(Date.now() - 15 * 60 * 1000);

  const recordingsEncoding: Array<RecordingQueue> = await prisma.$queryRaw`
    UPDATE "recordingQueue"
    SET 
      "errorState" = ${RecordingQueueState.MERGING},
      "status" = ${RecordingQueueState.FAILED},
      "attempts" = "attempts" + 1,
      "finishedAt" = NOW()
    WHERE
      "status" IN (${RecordingQueueState.MERGING}, ${RecordingQueueState.MERGING_UPLOADING})
      AND "startedAt" < ${timeoutDate}
      AND "attempts" < 3
    RETURNING *;
  `;

  return recordingsEncoding;
};

const cleanupFiles = async (
  recordings: Array<RecordingQueue>,
): Promise<void> => {
  if (recordings.length === 0) {
    return;
  }

  recordings.forEach((recording) => {
    try {
      rmSync(
        join(
          process.env.RECORDINGS_PATH || "",
          "recordings",
          recording.userId,
          recording.fileName.replace("s3://", ""),
        ),
      );
    } catch {}

    try {
      rmSync(
        join(
          process.env.RECORDINGS_PATH || "",
          "recordings",
          recording.userId,
          recording.fileName.replace("s3://", "").replace(".mp4", ".webp"),
        ),
      );
    } catch {}
  });

  await deleteFile(
    ...recordings.map((recording) =>
      join(recording.userId, recording.fileName),
    ),
  );
};

export const queueTaskTimeout = async (signal: AbortSignal) => {
  throwIfJobAborted(signal);

  const isUsingS3Bucket = process.env.S3_BUCKET_ENDPOINT;

  const recordingsUploading = await markUploadingRecordingsAsFailed();

  const recordingsEncoding = await markEncodingRecordingsAsFailed();

  const recordingsMerging = await markMergingRecordingsAsFailed();

  throwIfJobAborted(signal);

  if (isUsingS3Bucket) {
    await cleanupFiles([
      ...recordingsUploading,
      ...recordingsEncoding,
      ...recordingsMerging,
    ]);
  }
};
