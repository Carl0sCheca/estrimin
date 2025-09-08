import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import prisma from "../../src/lib/prisma";
import { RecordingQueueState } from "@prisma/client";
import { SITE_SETTING } from "../../src/interfaces";
import {
  Command,
  DEFAULT_SOCKET,
  SOCK_COMMAND,
} from "../../src/interfaces/actions/scheduler";
import * as zmq from "zeromq";
import {
  handleNewVideo,
  reencodeWithOriginalSettings,
} from "./videoProcessing";
import * as fs from "fs";

const JOB_RECORDING_QUEUE = "JOB_QUEUE_TASK";
const JOB_RECORDING_QUEUE_TIMEOUT = "JOB_QUEUE_TIMEOUT_TASK";

let jobsRunning: Map<string, boolean> = new Map();

const schedulerSingleton = () => {
  return new ToadScheduler();
};

type SchedulerSingleton = ReturnType<typeof schedulerSingleton>;

const globalForScheduler = globalThis as unknown as {
  scheduler: SchedulerSingleton | undefined;
};

const globalForInit = globalThis as unknown as {
  isSchedulerInitialized: boolean;
};

if (!globalForInit.isSchedulerInitialized) {
  globalForInit.isSchedulerInitialized = false;
}

const scheduler = globalForScheduler.scheduler ?? schedulerSingleton();

export default scheduler;

if (process.env.NODE_ENV !== "production")
  globalForScheduler.scheduler = scheduler;

const updateLastExecutionFromSettings = async (task: string) => {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw<{ value: Record<string, string> }[]>`
        SELECT value FROM "siteSetting" 
        WHERE key = ${SITE_SETTING.LAST_QUEUES_EXECUTION} 
        FOR UPDATE
      `;

      const currentValue = result?.[0]?.value || {};
      const updatedValue = {
        ...currentValue,
        [task]: new Date().toISOString(),
      };

      await tx.siteSetting.upsert({
        where: { key: SITE_SETTING.LAST_QUEUES_EXECUTION },
        update: { value: updatedValue },
        create: {
          key: SITE_SETTING.LAST_QUEUES_EXECUTION,
          value: { [task]: new Date().toISOString() },
        },
      });
    });
  } catch (error) {
    console.error(`Error updating execution for ${task}:`, error);
  }
};

const queueTask = async () => {
  jobsRunning.set(JOB_RECORDING_QUEUE, true);

  await updateLastExecutionFromSettings(JOB_RECORDING_QUEUE);

  while (true) {
    const recordings = await prisma.recordingQueue.findMany({
      where: {
        AND: [
          {
            status: {
              notIn: [
                RecordingQueueState.COMPLETED,
                RecordingQueueState.MERGING,
                RecordingQueueState.ENCODING,
                RecordingQueueState.EXPIRED,
              ],
            },
          },
          {
            OR: [
              { status: { not: RecordingQueueState.FAILED } },
              {
                AND: [
                  { status: RecordingQueueState.FAILED },
                  { error: { not: null } },
                  { error: { in: ["ENCODING", "MERGING"] } },
                  { attempts: { lt: 3 } },
                ],
              },
            ],
          },
          {
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 48 * 1000) },
          },
        ],
      },
      take: 1,
      orderBy: { createdAt: "asc" },
    });

    if (recordings.length === 0) {
      break;
    }

    const [recording] = recordings;

    if (
      recording.status === RecordingQueueState.PENDING ||
      (recording.status === RecordingQueueState.FAILED &&
        recording.error === "ENCODING" &&
        recording.attempts < 3)
    ) {
      try {
        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.ENCODING,
            startedAt: new Date(),
          },
        });

        const reencodeFileName = `${recording.fileName}.reencoded`;

        await reencodeWithOriginalSettings(
          recording.fileName,
          reencodeFileName
        );

        fs.rmSync(`${recording.fileName}`);
        fs.renameSync(reencodeFileName, `${recording.fileName}`);

        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.ENCODED,
            finishedAt: new Date(),
          },
        });
      } catch {
        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.FAILED,
            finishedAt: new Date(),
            error: "ENCODING",
            attempts: { increment: 1 },
          },
        });
      }
    } else if (
      recording.status === RecordingQueueState.ENCODED ||
      (recording.status === RecordingQueueState.FAILED &&
        recording.error === "MERGING" &&
        recording.attempts < 3)
    ) {
      try {
        if (
          recording.status === RecordingQueueState.ENCODED &&
          recording.attempts > 0
        ) {
          await prisma.recordingQueue.update({
            where: { id: recording.id },
            data: {
              status: RecordingQueueState.MERGING,
              startedAt: new Date(),
              attempts: 0,
              error: null,
            },
          });
        } else {
          await prisma.recordingQueue.update({
            where: { id: recording.id },
            data: {
              status: RecordingQueueState.MERGING,
              startedAt: new Date(),
            },
          });
        }

        await handleNewVideo(recording.userId, recording.fileName, 2000);

        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.MERGED,
            finishedAt: new Date(),
          },
        });
      } catch {
        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.FAILED,
            finishedAt: new Date(),
            error: "MERGING",
            attempts: { increment: 1 },
          },
        });
      }
    }

    if (recording.status === RecordingQueueState.MERGED) {
      try {
        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.COMPLETED,
          },
        });
      } catch {}
    }
  }

  jobsRunning.set(JOB_RECORDING_QUEUE, false);
};

const queueTaskTimeout = async () => {
  jobsRunning.set(JOB_RECORDING_QUEUE_TIMEOUT, true);

  await updateLastExecutionFromSettings(JOB_RECORDING_QUEUE_TIMEOUT);

  const clearedExpiredRecordings = await prisma.recordingQueue.deleteMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      },
    },
  });

  if (clearedExpiredRecordings.count > 0) {
    console.info(
      `Removed ${clearedExpiredRecordings.count} expired recordings`
    );
  }

  let recordings = await prisma.recordingQueue.updateMany({
    where: {
      createdAt: {
        lte: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      status: {
        notIn: [
          RecordingQueueState.FAILED,
          RecordingQueueState.EXPIRED,
          RecordingQueueState.COMPLETED,
        ],
      },
    },
    data: {
      status: RecordingQueueState.EXPIRED,
      error: "Expired",
      finishedAt: new Date(),
    },
  });

  if (recordings.count > 0) {
    console.info(`Cleared ${recordings.count} expired recordings`);
  }

  let recordingsCount = 0;

  recordings = await prisma.recordingQueue.updateMany({
    where: {
      status: {
        in: [RecordingQueueState.ENCODING],
      },
      startedAt: {
        lt: new Date(Date.now() - 10 * 60 * 1000), // more than 10 minutes
      },
    },
    data: {
      status: RecordingQueueState.FAILED,
      finishedAt: new Date(),
      attempts: { increment: 1 },
      error: "ENCODING",
    },
  });

  recordingsCount += recordings.count;

  recordings = await prisma.recordingQueue.updateMany({
    where: {
      status: {
        in: [RecordingQueueState.MERGING],
      },
      startedAt: {
        lt: new Date(Date.now() - 10 * 60 * 1000), // more than 10 minutes
      },
    },
    data: {
      status: RecordingQueueState.FAILED,
      finishedAt: new Date(),
      attempts: { increment: 1 },
      error: "MERGING",
    },
  });

  recordingsCount += recordings.count;

  if (recordingsCount > 0) {
    console.info(`Cleared ${recordings.count} timeout recordings`);
  }

  jobsRunning.set(JOB_RECORDING_QUEUE_TIMEOUT, false);
};

const queueJob = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask("task_" + JOB_RECORDING_QUEUE, async () => await queueTask()),
  {
    id: JOB_RECORDING_QUEUE,
    preventOverrun: true,
  }
);

const queueJobTimeout = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask(
    "task_" + JOB_RECORDING_QUEUE_TIMEOUT,
    async () => await queueTaskTimeout()
  ),
  {
    id: JOB_RECORDING_QUEUE_TIMEOUT,
    preventOverrun: true,
  }
);

const initScheduler = async () => {
  if (globalForInit.isSchedulerInitialized) return;
  globalForInit.isSchedulerInitialized = true;

  try {
    scheduler.stopById(JOB_RECORDING_QUEUE);
    scheduler.removeById(JOB_RECORDING_QUEUE);
    scheduler.stopById(JOB_RECORDING_QUEUE_TIMEOUT);
    scheduler.removeById(JOB_RECORDING_QUEUE_TIMEOUT);
  } catch {}

  scheduler.addSimpleIntervalJob(queueJob);
  scheduler.addSimpleIntervalJob(queueJobTimeout);
};

initScheduler();

const messagesFromEstrimin = async () => {
  const sock = new zmq.Reply();

  await sock.bind(DEFAULT_SOCKET);

  for await (const [msg] of sock) {
    const message = new TextDecoder().decode(msg);

    const command = JSON.parse(message) as Command;

    const commandAction = +command.c;
    const commandArg = command.a;

    if (commandAction === SOCK_COMMAND.STOP) {
      if (commandArg) {
        scheduler.stopById(commandArg);
        await sock.send("STOPPED");
      } else {
        await sock.send("NO ID");
      }
    } else if (commandAction === SOCK_COMMAND.STOP_ALL) {
      scheduler.stop();
      await sock.send("STOPPED");
    } else if (commandAction === SOCK_COMMAND.LIST) {
      const jobs = scheduler?.getAllJobs();

      const siteSetting = await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.LAST_QUEUES_EXECUTION },
      });

      const lastExecutionsMap = new Map<string, Date>();

      if (siteSetting?.value) {
        try {
          let data: Record<string, unknown>;

          if (typeof siteSetting.value === "string") {
            data = JSON.parse(siteSetting.value);
          } else if (typeof siteSetting.value === "object") {
            data = siteSetting.value as Record<string, unknown>;
          } else {
            throw new Error("Unexpected data type");
          }

          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === "string") {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                lastExecutionsMap.set(key, date);
              }
            }
          });
        } catch {}

        const serializableJobs = jobs?.map((job) => ({
          id: job.id,
          status: job?.getStatus(),
          isRunning: jobsRunning.get(job.id || ""),
          lastExecution: job.id ? lastExecutionsMap.get(job.id) : null,
        }));

        await sock.send(JSON.stringify(serializableJobs));
      }
    } else if (commandAction === SOCK_COMMAND.START_ALL) {
      try {
        if (
          ((
            await prisma.siteSetting.findUnique({
              where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
            })
          )?.value as boolean) ??
          false
        ) {
          await sock.send("CANNOT BE RESUMED");
          return;
        }

        scheduler.getAllJobs().forEach((job) => {
          if (!job.id) {
            return;
          }

          if (
            (job?.getStatus() === "stopped" &&
              !jobsRunning.get(job.id)?.valueOf()) ||
            !jobsRunning.get(job.id)?.valueOf()
          ) {
            scheduler.startById(job.id);
          }
        });
      } catch {}

      await sock.send("RESUMED");
    } else if (commandAction === SOCK_COMMAND.START) {
      if (commandArg) {
        if (
          ((
            await prisma.siteSetting.findUnique({
              where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
            })
          )?.value as boolean) ??
          false
        ) {
          await sock.send("RESUMED");
          return;
        }

        scheduler
          .getAllJobs()
          .filter((job) => job.id === commandArg)
          .forEach((job) => {
            if (!job.id) {
              return;
            }

            if (
              (job?.getStatus() === "stopped" &&
                !jobsRunning.get(job.id)?.valueOf()) ||
              !jobsRunning.get(job.id)?.valueOf()
            ) {
              scheduler.startById(job.id);
            }
          });

        await sock.send("RESUMED");
      } else {
        await sock.send("NO ID");
      }
    }
  }
};

messagesFromEstrimin();
