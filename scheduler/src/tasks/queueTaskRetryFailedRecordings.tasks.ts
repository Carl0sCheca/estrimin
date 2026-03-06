import { RecordingQueueState } from "@/generated/enums";
import prisma from "@/lib/prisma";
import { JOB_RETRY_FAILED_QUEUE } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";

export const queueTaskRetryFailedRecordings = async () => {
  console.info(`Running queueTaskRetryFailedRecordings at ${new Date()}`);

  await updateLastExecutionFromSettings(JOB_RETRY_FAILED_QUEUE);

  await prisma.$queryRaw`
    UPDATE "recordingQueue"
    SET
      "status" = "errorState",
      "errorState" = null,
      "startedAt" = NOW()
    WHERE
      "status" = ${RecordingQueueState.FAILED}
      AND "attempts" < 3
    RETURNING *;
  `;
};
