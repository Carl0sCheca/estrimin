import { queueTaskExpiredRecordings } from "@scheduler/tasks";
import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";

export const JOB_EXPIRED_RECORDINGS_QUEUE = "JOB_EXPIRED_RECORDINGS_QUEUE";

export const queueJobTimeout = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_EXPIRED_RECORDINGS_QUEUE,
    async () => await queueTaskExpiredRecordings(),
  ),
  {
    id: JOB_EXPIRED_RECORDINGS_QUEUE,
    preventOverrun: true,
  },
);
