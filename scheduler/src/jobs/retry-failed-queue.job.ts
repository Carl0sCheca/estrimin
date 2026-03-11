import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { queueTaskRetryFailedRecordings } from "@scheduler/tasks/queue-retry-failed-recordings.task";

export const JOB_RETRY_FAILED_QUEUE = "JOB_RETRY_FAILED_QUEUE";

export const queueRetryFailedJob = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_RETRY_FAILED_QUEUE,
    async () => await queueTaskRetryFailedRecordings(),
  ),
  {
    id: JOB_RETRY_FAILED_QUEUE,
    preventOverrun: true,
  },
);
