import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { queueTaskTimeout } from "@scheduler/tasks";

export const JOB_RECORDING_QUEUE_TIMEOUT = "JOB_RECORDING_QUEUE_TIMEOUT";

export const queueJobTimeout = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_RECORDING_QUEUE_TIMEOUT,
    async () => await queueTaskTimeout(),
  ),
  {
    id: JOB_RECORDING_QUEUE_TIMEOUT,
    preventOverrun: true,
  },
);
