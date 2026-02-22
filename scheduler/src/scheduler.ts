import { ToadScheduler } from "toad-scheduler";

interface SharedSchedulerInstance {
  scheduler?: ToadScheduler;
}

const globalForScheduler = globalThis as unknown as SharedSchedulerInstance;

export const scheduler = globalForScheduler.scheduler ?? new ToadScheduler();

if (process.env.NODE_ENV !== "production") {
  globalForScheduler.scheduler = scheduler;
}
