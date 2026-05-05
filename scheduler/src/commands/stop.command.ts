import prisma from "@/lib/prisma";
import { hostname } from "node:os";
import { ToadScheduler } from "toad-scheduler";
import { Reply } from "zeromq";
import { abortAllJobs, abortJob } from "../jobs/runtime";

export const stopAllCommand = async (sock: Reply, scheduler: ToadScheduler) => {
  abortAllJobs();
  scheduler.stop();
  await sock.send(null);
};

export const stopCommand = async (
  sock: Reply,
  scheduler: ToadScheduler,
  args: string | undefined,
) => {
  if (!args) {
    await sock.send(null);
    return;
  }

  abortJob(args);
  scheduler.removeById(args);

  await prisma.task.updateMany({
    where: {
      hostname: hostname(),
      task: args,
    },
    data: {
      isRunning: false,
    },
  });

  await sock.send(null);
};
