import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { queueTaskUploading } from "@scheduler/tasks";

export const JOB_UPLOADING_QUEUE = "JOB_UPLOADING_QUEUE";

export const queueUploadingJob = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_UPLOADING_QUEUE,
    async () => await queueTaskUploading(),
  ),
  {
    id: JOB_UPLOADING_QUEUE,
    preventOverrun: true,
  },
);
