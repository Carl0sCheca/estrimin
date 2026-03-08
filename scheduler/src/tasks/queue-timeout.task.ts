import { RecordingQueue } from "@/generated/client";
import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_RECORDING_QUEUE_TIMEOUT } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";
import { deleteFile } from "@scheduler/services/s3.service";
import { join } from "node:path";

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

const cleanupS3Files = async (
  recordings: Array<RecordingQueue>,
): Promise<void> => {
  if (recordings.length === 0) {
    return;
  }

  await deleteFile(
    ...recordings.map((recording) =>
      join(recording.userId, recording.fileName),
    ),
  );
};

export const queueTaskTimeout = async () => {
  if (
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ??
    false
  ) {
    return;
  }

  console.info(`Running queueTaskTimeout at ${new Date()}`);

  await updateLastExecutionFromSettings(JOB_RECORDING_QUEUE_TIMEOUT);

  const isUsingS3Bucket = process.env.S3_BUCKET_ENDPOINT;

  const recordingsUploading = await markUploadingRecordingsAsFailed();

  const recordingsEncoding = await markEncodingRecordingsAsFailed();

  const recordingsMerging = await markMergingRecordingsAsFailed();

  if (isUsingS3Bucket) {
    await cleanupS3Files([
      ...recordingsUploading,
      ...recordingsEncoding,
      ...recordingsMerging,
    ]);
  }
};
