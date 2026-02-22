import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { ListedJob, RawJob } from "@scheduler/interfaces";
import { ToadScheduler } from "toad-scheduler";
import { Reply } from "zeromq";

export const listCommand = async (sock: Reply, scheduler: ToadScheduler) => {
  const jobs = scheduler.getAllJobs();

  const result = await prisma.siteSetting.findFirst({
    select: { value: true },
    where: {
      key: SITE_SETTING.LAST_QUEUES_EXECUTION,
    },
  });

  const queueDates = (result?.value as unknown as Record<string, string>) ?? {};

  const serializableJobs: Array<ListedJob> =
    jobs?.map((job) => ({
      id: job.id,
      status: job.getStatus(),
      isRunning: (job as unknown as RawJob).task.isExecuting,
      lastExecution: queueDates[job.id || ""]
        ? new Date(queueDates[job.id || ""])
        : undefined,
    })) ?? [];

  await sock.send(JSON.stringify(serializableJobs));
};
