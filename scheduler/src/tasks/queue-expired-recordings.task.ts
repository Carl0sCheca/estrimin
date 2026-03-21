import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_EXPIRED_RECORDINGS_QUEUE } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";
import { rmSync } from "fs";
import { join } from "path";

export const queueTaskExpiredRecordings = async () => {
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

  await updateLastExecutionFromSettings(JOB_EXPIRED_RECORDINGS_QUEUE);
  console.info(`Running queueTaskExpiredRecordings at ${new Date()}`);

  const deletedRecordings = await prisma.recordingQueue.deleteMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours
      },
    },
  });

  const expiredRecordings = await prisma.recordingQueue.updateManyAndReturn({
    where: {
      AND: {
        createdAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours
        },
        status: {
          notIn: [RecordingQueueState.EXPIRED],
        },
      },
    },
    data: {
      status: RecordingQueueState.EXPIRED,
    },
  });

  if (deletedRecordings.count > 0) {
    console.info(`Deleted ${deletedRecordings.count} expired recordings`);
  }

  if (expiredRecordings.length > 0) {
    console.info(`Expired ${expiredRecordings.length} recordings`);

    try {
      expiredRecordings.forEach((recording) => {
        rmSync(
          join(
            process.env.RECORDINGS_PATH || "",
            "recordings",
            recording.userId,
            recording.fileName.replace(".mp4", ".webp"),
          ),
        );
      });
    } catch {}
  }
};
