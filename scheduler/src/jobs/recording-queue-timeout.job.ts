import { queueTaskTimeout } from "@scheduler/tasks";
import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";

export const JOB_RECORDING_TIMEOUT_QUEUE = "JOB_RECORDING_TIMEOUT_QUEUE";

export const queueJobTimeout = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_RECORDING_TIMEOUT_QUEUE,
    async () => await queueTaskTimeout(),
  ),
  {
    id: JOB_RECORDING_TIMEOUT_QUEUE,
    preventOverrun: true,
  },
);
