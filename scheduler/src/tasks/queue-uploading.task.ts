import { RecordingQueue } from "@/generated/client";
import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_RECORDING_QUEUE, JOB_UPLOADING_QUEUE } from "@scheduler/jobs";
import { scheduler } from "@scheduler/scheduler";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";
import { uploadFile } from "@scheduler/services/s3.service";
import { rmSync } from "fs";
import { basename, join } from "path";

export const queueTaskUploading = async () => {
  const disableUploadingQueue =
    process.env.DISABLE_UPLOADING_QUEUE?.toLowerCase() === "true";

  if (disableUploadingQueue) {
    return;
  }

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

  await updateLastExecutionFromSettings(JOB_UPLOADING_QUEUE);

  while (true) {
    const recording = await prisma.$transaction(async (tx) => {
      const record = await tx.$queryRaw<Array<RecordingQueue>>`
      SELECT * FROM "recordingQueue"
      WHERE 
        "status" = ${RecordingQueueState.RECORDED}
        AND
        "createdAt" >= NOW() - INTERVAL '2 DAYS'
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
          previousState: RecordingQueueState.RECORDED,
          startedAt: new Date(),
        },
      });
    });

    if (!recording) {
      break;
    }

    const isUsingS3Bucket = process.env.S3_BUCKET_ENDPOINT;

    if (!isUsingS3Bucket) {
      await prisma.recordingQueue.update({
        where: {
          id: recording.id,
        },
        data: {
          status: RecordingQueueState.UPLOADED,
          previousState: RecordingQueueState.UPLOADING,
          finishedAt: new Date(),
          attempts: 0,
          errorState: null,
          errorMessage: null,
        },
      });
    } else {
      const fileUpload = await uploadFile(
        `recordings/${recording.userId}/${basename(recording.fileName)}`,
        join(
          process.env.RECORDINGS_PATH || "",
          "recordings",
          recording.userId,
          basename(recording.fileName),
        ),
        "video/mp4",
      );

      if (fileUpload) {
        try {
          await prisma.recordingQueue.update({
            where: {
              id: recording.id,
            },
            data: {
              fileName: `s3://${recording.fileName}`,
              status: RecordingQueueState.UPLOADED,
              previousState: RecordingQueueState.UPLOADING,
              finishedAt: new Date(),
              attempts: 0,
              errorState: null,
              errorMessage: null,
            },
          });

          rmSync(
            join(
              process.env.RECORDINGS_PATH || "",
              "recordings",
              recording.userId,
              basename(recording.fileName),
            ),
          );
        } catch (error) {
          console.error(
            "queueTaskUploading: Error deleting local file: ",
            error,
          );
          return;
        }
      }
    }

    scheduler.startById(JOB_RECORDING_QUEUE);
  }
};
