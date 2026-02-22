import { ToadScheduler } from "toad-scheduler";
import { Reply } from "zeromq";

export const startAllCommand = async (
  sock: Reply,
  scheduler: ToadScheduler,
) => {
  const jobs = scheduler.getAllJobs();

  jobs.forEach((job) => job.id && scheduler.startById(job.id));

  await sock.send(null);
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
