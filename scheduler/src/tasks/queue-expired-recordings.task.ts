import { RecordingQueueState } from "@/generated/enums";
import prisma from "@/lib/prisma";
import { rmSync } from "fs";
import { join } from "path";
import { throwIfJobAborted } from "../jobs/runtime";

export const queueTaskExpiredRecordings = async (signal: AbortSignal) => {
  throwIfJobAborted(signal);

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

  throwIfJobAborted(signal);

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
