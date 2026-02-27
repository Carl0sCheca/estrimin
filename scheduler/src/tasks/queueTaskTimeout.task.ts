import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_RECORDING_QUEUE } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";

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

  await updateLastExecutionFromSettings(JOB_RECORDING_QUEUE);
};
