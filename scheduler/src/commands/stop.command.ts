import { ToadScheduler } from "toad-scheduler";
import { Reply } from "zeromq";

export const stopAllCommand = async (sock: Reply, scheduler: ToadScheduler) => {
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

  scheduler.stopById(args);

  await sock.send(null);
};
