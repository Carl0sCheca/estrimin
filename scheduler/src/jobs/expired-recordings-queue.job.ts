import { queueTaskExpiredRecordings } from "@scheduler/tasks";
import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { runJob } from ".";

export const JOB_EXPIRED_RECORDINGS_QUEUE = "JOB_EXPIRED_RECORDINGS_QUEUE";

export const queueJobExpired = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_EXPIRED_RECORDINGS_QUEUE,
    async () =>
      await runJob(JOB_EXPIRED_RECORDINGS_QUEUE, queueTaskExpiredRecordings),
  ),
  {
    id: JOB_EXPIRED_RECORDINGS_QUEUE,
    preventOverrun: true,
  },
);
