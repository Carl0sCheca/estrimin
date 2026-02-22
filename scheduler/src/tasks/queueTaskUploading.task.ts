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

  await updateLastExecutionFromSettings(JOB_UPLOADING_QUEUE);
};
