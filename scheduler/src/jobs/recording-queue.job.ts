import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { queueTask } from "@scheduler/tasks";

export const JOB_RECORDING_QUEUE = "JOB_RECORDING_QUEUE";

export const queueJob = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask("task_" + JOB_RECORDING_QUEUE, async () => await queueTask()),
  {
    id: JOB_RECORDING_QUEUE,
    preventOverrun: true,
  },
);
