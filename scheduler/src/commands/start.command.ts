import prisma from "@/lib/prisma";
import { MAX_ENCODING_QUEUE, maxOneTasksJob } from "@scheduler/jobs";
import { hostname } from "node:os";
import { ToadScheduler } from "toad-scheduler";
import { Reply } from "zeromq";
import { ALL_QUEUES_JOBS } from "..";

export const startAllCommand = async (
  sock: Reply,
  scheduler: ToadScheduler,
) => {
  const jobs = ALL_QUEUES_JOBS;
  const failedJobs = [];

  for (const job of jobs) {
    if (!job) {
      return;
    }

    const exists = await prisma.task.findMany({
      where: {
        task: job,
        isRunning: true,
      },
    });

    if (exists.length === 0 && maxOneTasksJob.includes(job)) {
      scheduler.startById(job);
    } else if (
      !maxOneTasksJob.includes(job) &&
      exists.filter((task) => task.hostname === hostname()).length <
        MAX_ENCODING_QUEUE
    ) {
      scheduler.startById(job);
    } else {
      failedJobs.push(job);
    }
  }

  await sock.send(JSON.stringify(failedJobs));
};

export const startCommand = async (
  sock: Reply,
  scheduler: ToadScheduler,
  args: string | undefined,
) => {
  if (!args) {
    await sock.send(null);
    return;
  }

  scheduler.startById(args);

  await sock.send(null);
};
