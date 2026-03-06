import { RecordingQueue } from "@/generated/client";
import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_RECORDING_QUEUE_TIMEOUT } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";
import { deleteFile } from "@scheduler/services/s3.service";
import { join } from "node:path";

const markUploadingRecordingsAsFailed = async (): Promise<RecordingQueue[]> => {
  const recordingsUploading: Array<RecordingQueue> = await prisma.$queryRaw`
    UPDATE "recordingQueue"
    SET 
      "errorState" = ${RecordingQueueState.RECORDED},
      "status" = ${RecordingQueueState.FAILED},
      "attempts" = "attempts" + 1,
      "finishedAt" = NOW()
    WHERE 
      "status" = ${RecordingQueueState.UPLOADING}
      AND "startedAt" < NOW() - INTERVAL '15 minutes'
      AND "attempts" < 3
    RETURNING *;
  `;

  return recordingsUploading;
};

const cleanupS3Files = async (recordings: RecordingQueue[]): Promise<void> => {
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

  const recordingsUploading = await markUploadingRecordingsAsFailed();

  const isUsingS3Bucket = process.env.S3_BUCKET_ENDPOINT;

  if (isUsingS3Bucket) {
    await cleanupS3Files(recordingsUploading);
  }
};
