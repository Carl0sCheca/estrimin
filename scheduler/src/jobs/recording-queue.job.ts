import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { queueTask } from "@scheduler/tasks";
import { runJob } from ".";

export const JOB_RECORDING_QUEUE = "JOB_RECORDING_QUEUE";

export const queueJob = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_RECORDING_QUEUE,
    async () => await runJob(JOB_RECORDING_QUEUE, queueTask),
  ),
  {
    id: JOB_RECORDING_QUEUE,
    preventOverrun: true,
  },
);
