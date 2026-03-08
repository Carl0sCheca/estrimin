import { RecordingQueueState } from "@/generated/enums";
import prisma from "@/lib/prisma";
import { JOB_RETRY_FAILED_QUEUE } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";
import { execSync } from "child_process";
import { hostname } from "os";

export const queueTaskRetryFailedRecordings = async () => {
  console.info(`Running queueTaskRetryFailedRecordings at ${new Date()}`);

  await updateLastExecutionFromSettings(JOB_RETRY_FAILED_QUEUE);

  const failedToRetry = await prisma.recordingQueue.findMany({
    where: {
      status: RecordingQueueState.FAILED,
      attempts: { lt: 3 },
    },
  });

  const statesToKill: Array<RecordingQueueState> = [
    RecordingQueueState.ENCODING,
    RecordingQueueState.ENCODED_UPLOADING,
    RecordingQueueState.MERGING,
    RecordingQueueState.MERGING_UPLOADING,
  ];

  failedToRetry.forEach((recording) => {
    if (
      statesToKill.includes(recording.status) &&
      hostname() === recording.hostname &&
      recording.workerPid
    ) {
      try {
        process.kill(recording.workerPid, 0);

        const processName = execSync(`ps -p ${recording.workerPid} -o comm=`)
          .toString()
          .trim();

        if (processName.toLowerCase().includes("ffmpeg")) {
          process.kill(recording.workerPid, "SIGTERM");
        }
      } catch {}
    }
  });

  await prisma.$queryRaw`
    UPDATE "recordingQueue"
    SET
      "status" = "previousState",
      "errorState" = null,
      "startedAt" = NOW(),
      "hostname" = null,
      "workerPid" = null,
    WHERE
      "status" = ${RecordingQueueState.FAILED}
      AND "attempts" < 3
    RETURNING *;
  `;
};
