import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { hostname } from "os";
import { JOB_RECORDING_QUEUE_TIMEOUT } from "./timeout-queue.job";
import { JOB_EXPIRED_RECORDINGS_QUEUE } from "./expired-recordings-queue.job";
import { JOB_RETRY_FAILED_QUEUE } from "./retry-failed-queue.job";
import {
  clearJobController,
  JobAbortError,
  setJobController,
  throwIfJobAborted,
} from "./runtime";

export * from "./expired-recordings-queue.job";
export * from "./recording-queue.job";
export * from "./retry-failed-queue.job";
export * from "./timeout-queue.job";
export * from "./uploading-queue.job";

export const maxOneTasksJob = [
  JOB_RECORDING_QUEUE_TIMEOUT,
  JOB_EXPIRED_RECORDINGS_QUEUE,
  JOB_RETRY_FAILED_QUEUE,
];

export const MAX_ENCODING_QUEUE = 4;
const TASK_STALE_AFTER_MS = 5 * 60 * 1000;

const isSingleTaskJob = (jobName: string) => maxOneTasksJob.includes(jobName);

const createOrUpdateTaskFromDB = async (jobName: string) => {
  const currentHostname = hostname();
  const now = new Date();

  await prisma.task.deleteMany({
    where: { lastRun: { lt: new Date(now.getTime() - TASK_STALE_AFTER_MS) } },
  });

  const tasks = await prisma.task.findMany({
    where: {
      task: jobName,
    },
  });

  const taskData = {
    hostname: currentHostname,
    task: jobName,
    port: 4000,
    isRunning: true,
    lastRun: now,
  };

  if (isSingleTaskJob(jobName)) {
    const task = tasks.at(0);

    if (task?.isRunning) {
      return null;
    }

    if (task) {
      return prisma.task.update({
        where: { id: task.id },
        data: taskData,
      });
    }

    return prisma.task.create({
      data: taskData,
    });
  }

  const runningTasks = tasks.filter(
    (task) => task.isRunning && task.hostname === currentHostname,
  );

  if (runningTasks.length >= MAX_ENCODING_QUEUE) {
    return null;
  }

  const reusableTask = tasks.find(
    (task) => !task.isRunning && task.hostname === currentHostname,
  );

  if (reusableTask) {
    return prisma.task.update({
      where: { id: reusableTask.id },
      data: taskData,
    });
  }

  return prisma.task.create({
    data: taskData,
  });
};

export const runJob = async (
  jobName: string,
  jobTask: (signal: AbortSignal) => Promise<void>,
) => {
  if (
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ??
    false
  ) {
    return;
  }

  const taskRunning = await createOrUpdateTaskFromDB(jobName);

  if (!taskRunning) {
    return;
  }

  const controller = new AbortController();
  setJobController(jobName, controller);

  try {
    throwIfJobAborted(controller.signal);
    await jobTask(controller.signal);
  } catch (error) {
    const isAbortError =
      error instanceof JobAbortError ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError");

    if (!isAbortError) {
      throw error;
    }
  } finally {
    clearJobController(jobName);

    try {
      await prisma.task.update({
        where: {
          id: taskRunning.id,
        },
        data: {
          isRunning: false,
        },
      });

      await prisma.taskMachine.upsert({
        create: {
          hostname: hostname(),
          port: 4000,
          heartbeat: new Date(),
        },
        update: {
          heartbeat: new Date(),
        },
        where: {
          hostname_port: {
            hostname: hostname(),
            port: 4000,
          },
        },
      });

      await prisma.taskMachine.deleteMany({
        where: {
          heartbeat: {
            lt: new Date(new Date().getTime() - TASK_STALE_AFTER_MS),
          },
        },
      });
    } catch (error) {
      console.error(
        `runJob: failed to update task state for ${jobName}`,
        error,
      );
    }
  }
};
