import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import prisma from "../../src/lib/prisma";
import { RecordingQueueState } from "../../src/generated/client";
import { SITE_SETTING } from "../../src/interfaces";
import {
  Command,
  DEFAULT_SOCKET,
  SOCK_COMMAND,
} from "../../src/interfaces/actions/scheduler";
import * as zmq from "zeromq";
import {
  generateThumbnail,
  getSortedVideoFiles,
  handleNewVideo,
  reencodeWithOriginalSettings,
} from "./videoProcessing";
import * as fs from "fs";
import { basename, join } from "path";

import { downloadFile, listRecordingFilesS3, uploadFile } from "./S3Service";

const JOB_RECORDING_QUEUE = "JOB_QUEUE_TASK";
const JOB_RECORDING_QUEUE_TIMEOUT = "JOB_QUEUE_TIMEOUT_TASK";
const JOB_UPLOADING_QUEUE = "JOB_UPLOADING_QUEUE";

const jobsRunning: Map<string, boolean> = new Map();

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
    await prisma.$transaction(
      async (tx) => {
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
      },
      {
        maxWait: 30000,
        timeout: 20000,
      },
    );
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
                  { error: { in: ["UPLOADING", "ENCODING", "MERGING"] } },
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

        const isUsingS3Bucket = recording.fileName.startsWith("s3://");

        const filePath = join(
          process.env.RECORDINGS_PATH || "",
          "recordings",
          recording.userId,
          recording.fileName.replace("s3://", ""),
        );

        if (isUsingS3Bucket) {
          await downloadFile(
            `recordings/${recording.userId}/${recording.fileName.replace(
              "s3://",
              "",
            )}`,
            filePath,
          );
        }

        const reencodeFileName = `${filePath}.reencoded`;

        await reencodeWithOriginalSettings(filePath, reencodeFileName);

        fs.rmSync(`${filePath}`);
        fs.renameSync(reencodeFileName, `${filePath}`);

        await generateThumbnail(filePath);

        if (isUsingS3Bucket) {
          const fileUpload = await uploadFile(
            `recordings/${recording.userId}/${recording.fileName.replace(
              "s3://",
              "",
            )}`,
            filePath,
            "video/mp4",
          );

          const fileUploadThumbnail = await uploadFile(
            `recordings/${recording.userId}/${recording.fileName
              .replace("s3://", "")
              .replace(".mp4", ".webp")}`,
            filePath.replace(".mp4", ".webp"),
            "image/webp",
          );

          try {
            fs.rmSync(filePath);
            fs.rmSync(filePath.replace(".mp4", ".webp"));
          } catch (err) {
            console.error("Error while trying to delete local files", err);
          }

          if (!fileUpload || !fileUploadThumbnail) {
            console.error("Error uploading recording after encoding video");

            throw new Error("Error while uploading video to S3 bucket");
          }
        }

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

  const recordings = await prisma.recordingQueue.findMany({
    where: {
      AND: [
        {
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 48 * 1000) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const groupedAndSorted = recordings.reduce(
    (acc, recording) => {
      const segmentId = recording.firstSegmentId;

      if (segmentId) {
        if (!acc[segmentId]) {
          acc[segmentId] = [];
        }
        acc[segmentId].push(recording);
      }
      return acc;
    },
    {} as Record<string, typeof recordings>,
  );

  const completedElementsNoMerged = Object.values(groupedAndSorted).map(
    (group) => {
      const sortedGroup = group.sort((b, a) => a.id - b.id);
      const lastElement = sortedGroup[sortedGroup.length - 1];
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      return {
        group: sortedGroup,
        // isLastElementOlderThan2Min: lastElement.createdAt < twoMinutesAgo,
        // allCompleted: sortedGroup.every((item) => item.status === "COMPLETED"),
        isReadyForProcessing:
          lastElement.createdAt < twoMinutesAgo &&
          sortedGroup.every(
            (item) => item.status === RecordingQueueState.COMPLETED,
          ) &&
          sortedGroup.length > 1,
      };
    },
  );

  const recordingsShouldBeMerged = completedElementsNoMerged
    .filter((e) => e.isReadyForProcessing)
    .map((recording) => recording.group);

  if (recordingsShouldBeMerged.length > 0) {
    const isUsingS3Bucket =
      recordingsShouldBeMerged[0][0].fileName.startsWith("s3://");

    let fileList = (
      await listRecordingFilesS3(recordingsShouldBeMerged[0][0].userId)
    )
      .map((e) =>
        e.Key?.replace("recordings/", isUsingS3Bucket ? "s3:///" : ""),
      )
      .filter((e) => e?.endsWith(".mp4"));

    if (isUsingS3Bucket) {
      fileList = (
        await listRecordingFilesS3(recordingsShouldBeMerged[0][0].userId)
      )
        .map((e) =>
          e.Key?.replace("recordings/", isUsingS3Bucket ? "s3:///" : ""),
        )
        .filter((e) => e?.endsWith(".mp4"));
    } else {
      fileList = (
        await getSortedVideoFiles(
          join(
            process.env.RECORDINGS_PATH || "",
            "recordings",
            recordingsShouldBeMerged[0][0].userId,
          ),
        )
      ).reverse();
    }

    fileList = fileList
      .filter(
        (elem) =>
          elem &&
          recordingsShouldBeMerged[0].some((recording) =>
            elem.endsWith(recording.fileName.split("/").pop() || ""),
          ),
      )
      .map((elem) =>
        elem?.replace(`/${recordingsShouldBeMerged[0][0].userId}`, ""),
      )
      .reverse();

    if (fileList.length > 1) {
      await handleNewVideo(
        recordingsShouldBeMerged[0][0].userId,
        fileList[0] || "",
        2000,
      );
    }
  }

  jobsRunning.set(JOB_RECORDING_QUEUE, false);
};

const queueTaskTimeout = async () => {
  jobsRunning.set(JOB_RECORDING_QUEUE_TIMEOUT, true);

  await updateLastExecutionFromSettings(JOB_RECORDING_QUEUE_TIMEOUT);

  const clearedExpiredRecordings = await prisma.recordingQueue.findMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      },
    },
  });

  if (clearedExpiredRecordings.length > 0) {
    clearedExpiredRecordings.forEach((recording) => {
      try {
        fs.rmSync(recording.fileName.replace(".mp4", ".webp"));
      } catch {}
    });

    const clearedExpiredRecordingsDeleted =
      await prisma.recordingQueue.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 72 * 60 * 60 * 1000),
          },
        },
      });

    console.info(
      `Removed ${clearedExpiredRecordingsDeleted.count} expired recordings`,
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

const queueTaskUploading = async () => {
  jobsRunning.set(JOB_UPLOADING_QUEUE, true);

  await updateLastExecutionFromSettings(JOB_UPLOADING_QUEUE);

  while (true) {
    const recordings = await prisma.recordingQueue.findMany({
      where: {
        OR: [
          {
            AND: [
              {
                status: {
                  in: [RecordingQueueState.UPLOADING],
                },
              },
              {
                createdAt: { gte: new Date(Date.now() - 60 * 60 * 48 * 1000) },
              },
            ],
          },
          {
            AND: [
              {
                status: {
                  in: [RecordingQueueState.FAILED],
                },
              },
              {
                error: RecordingQueueState.UPLOADING,
              },
              {
                attempts: { lt: 3 },
              },
              {
                createdAt: { gte: new Date(Date.now() - 60 * 60 * 48 * 1000) },
              },
            ],
          },
        ],
      },
      take: 1,
      orderBy: { createdAt: "asc" },
    });

    const startDate = new Date();

    if (recordings.length === 0) {
      break;
    }

    const [recording] = recordings;

    const fileName = join(
      process.env.RECORDINGS_PATH || "",
      "recordings",
      recording.userId,
      basename(recording.fileName),
    );

    try {
      const fileUpload = await uploadFile(
        `recordings/${recording.userId}/${basename(recording.fileName)}`,
        fileName,
        "video/mp4",
      );

      if (fileUpload) {
        try {
          await prisma.recordingQueue.update({
            where: { id: recording.id },
            data: {
              status: RecordingQueueState.UPLOADED,
              fileName: `s3://${basename(recording.fileName)}`,
              attempts: 0,
              error: null,
              startedAt: startDate,
              finishedAt: new Date(),
            },
          });
        } catch {}
      } else {
        throw new Error("Error uploading file to S3");
      }
    } catch (err) {
      console.error("Error uploading file to S3:", err);
      try {
        await prisma.recordingQueue.update({
          where: { id: recording.id },
          data: {
            status: RecordingQueueState.FAILED,
            error: "UPLOADING",
            attempts: recording.attempts + 1,
            startedAt: startDate,
            finishedAt: new Date(),
          },
        });
      } catch {}
    }
  }

  while (true) {
    const recordings = await prisma.recordingQueue.findMany({
      where: {
        AND: [
          {
            status: {
              in: [RecordingQueueState.UPLOADED],
            },
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

    try {
      fs.rmSync(
        `${join(
          process.env.RECORDINGS_PATH || "",
          "recordings",
          recording.userId,
          basename(recording.fileName),
        )}`,
      );
    } catch {}

    try {
      await prisma.recordingQueue.update({
        where: { id: recording.id },
        data: {
          status: RecordingQueueState.PENDING,
        },
      });
    } catch {}
  }

  jobsRunning.set(JOB_UPLOADING_QUEUE, false);
};

const queueJob = new SimpleIntervalJob(
  { minutes: 1, runImmediately: true },
  new AsyncTask("task_" + JOB_RECORDING_QUEUE, async () => await queueTask()),
  {
    id: JOB_RECORDING_QUEUE,
    preventOverrun: true,
  },
);

const queueJobTimeout = new SimpleIntervalJob(
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

const queueUploadingJob = new SimpleIntervalJob(
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
  scheduler.addSimpleIntervalJob(queueUploadingJob);
};

initScheduler();

const messagesFromEstrimin = async () => {
  console.info("Estrimin scheduler started");

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
