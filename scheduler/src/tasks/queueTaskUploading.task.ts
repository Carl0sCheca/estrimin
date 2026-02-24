import { RecordingQueue } from "@/generated/client";
import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_UPLOADING_QUEUE } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";

export const queueTaskUploading = async () => {
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

  console.info(`Running queueTaskUploading at ${new Date()}`);

  while (true) {
    const recording = await prisma.$transaction(async (tx) => {
      const record = await tx.$queryRaw<Array<RecordingQueue>>`
      SELECT * FROM "recordingQueue"
      WHERE "status" = ${RecordingQueueState.RECORDED}
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

      if (record.length === 0) {
        return null;
      }

      return await tx.recordingQueue.update({
        where: { id: record[0].id },
        data: {
          status: RecordingQueueState.UPLOADING,
          startedAt: new Date(),
        },
      });
    });

    if (!recording) {
      break;
    }

    const isUsingS3Bucket = recording.fileName.startsWith("s3://");

    if (!isUsingS3Bucket) {
      await prisma.recordingQueue.update({
        where: {
          id: recording.id,
        },
        data: {
          status: RecordingQueueState.UPLOADED,
          finishedAt: new Date(),
        },
      });

      continue;
    } else {
    }
  }

  await updateLastExecutionFromSettings(JOB_UPLOADING_QUEUE);
};
