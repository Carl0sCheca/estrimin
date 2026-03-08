import { RecordingQueue } from "@/generated/client";
import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { JOB_RECORDING_QUEUE } from "@scheduler/jobs";
import { updateLastExecutionFromSettings } from "@scheduler/services/execution-tracker.service";
import {
  deleteFile,
  downloadFile,
  uploadFile,
} from "@scheduler/services/s3.service";
import {
  generateThumbnail,
  mergeVideos,
  reencodeWithOriginalSettings,
} from "@scheduler/video-processing";
import { renameSync, rmSync } from "fs";
import { join } from "path";

const setPendingUploadedRecordings = async () => {
  try {
    await prisma.recordingQueue.updateMany({
      where: {
        status: RecordingQueueState.UPLOADED,
      },
      data: {
        status: RecordingQueueState.PENDING,
        previousState: RecordingQueueState.UPLOADED,
        startedAt: new Date(),
      },
    });
  } catch {}
};

const encodingRecordings = async () => {
  while (true) {
    const recording = await prisma.$transaction(async (tx) => {
      const record = await tx.$queryRaw<Array<RecordingQueue>>`
      SELECT * FROM "recordingQueue"
      WHERE 
        "status" = ${RecordingQueueState.PENDING}
        AND
        "createdAt" >= NOW() - INTERVAL '2 DAYS'
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

      if (record.length === 0) {
        return null;
      }

      return await tx.recordingQueue.update({
        where: { id: record[0].id },
        data: {
          status: RecordingQueueState.ENCODING,
          previousState: RecordingQueueState.PENDING,
          startedAt: new Date(),
        },
      });
    });

    if (!recording) {
      break;
    }

    const isUsingS3 = recording.fileName.startsWith("s3://");

    const recordingFileName = recording.fileName.replace("s3://", "");

    const localFile = join(
      process.env.RECORDINGS_PATH || "",
      "recordings",
      recording.userId,
      recordingFileName,
    );

    if (isUsingS3) {
      await downloadFile(
        `recordings/${recording.userId}/${recordingFileName}`,
        localFile,
      );
    }

    try {
      await reencodeWithOriginalSettings(
        localFile,
        localFile.replace(".mp4", ".encoded.mp4"),
      );

      rmSync(localFile);
      renameSync(localFile.replace(".mp4", ".encoded.mp4"), localFile);

      await generateThumbnail(localFile);

      if (isUsingS3) {
        await prisma.recordingQueue.update({
          where: {
            id: recording.id,
          },
          data: {
            status: RecordingQueueState.ENCODED_UPLOADING,
            startedAt: new Date(),
          },
        });

        await uploadFile(
          `recordings/${recording.userId}/${recordingFileName}`,
          localFile,
          "video/mp4",
        );

        await uploadFile(
          `recordings/${recording.userId}/${recordingFileName.replace(".mp4", ".webp")}`,
          localFile.replace(".mp4", ".webp"),
          "image/webp",
        );

        rmSync(localFile);
        rmSync(localFile.replace(".mp4", ".webp"));

        await prisma.recordingQueue.update({
          where: {
            id: recording.id,
          },
          data: {
            status: RecordingQueueState.ENCODED,
            finishedAt: new Date(),
            previousState: RecordingQueueState.PENDING,
            attempts: 0,
            errorState: null,
          },
        });
      } else {
        await prisma.recordingQueue.update({
          where: {
            id: recording.id,
          },
          data: {
            status: RecordingQueueState.ENCODED,
            finishedAt: new Date(),
            previousState: RecordingQueueState.PENDING,
            attempts: 0,
            errorState: null,
          },
        });
      }
    } catch (error) {
      console.error("encodingRecordings: Error while reencoding file", error);

      try {
        rmSync(localFile);
        rmSync(localFile.replace(".mp4", ".encoded.mp4"));
        rmSync(localFile.replace(".mp4", ".webp"));
      } catch {}
    }
  }
};

const mergingRecordings = async () => {
  while (true) {
    const pairData = await prisma.$transaction(async (tx) => {
      const records = await tx.$queryRaw`
        SELECT 
          r1.id as "id1", r1."segmentsIndex" as "index1", r1."fileName" as "file1",
          r2.id as "id2", r2."segmentsIndex" as "index2", r2."fileName" as "file2",
          r1."userId"
        FROM "recordingQueue" r1
        INNER JOIN "recordingQueue" r2 ON 
          r1."firstSegmentId" = r2."firstSegmentId" AND 
          r1."userId" = r2."userId"
        WHERE 
          r1."status" = ${RecordingQueueState.ENCODED} AND 
          r2."status" = ${RecordingQueueState.ENCODED} AND
          (SELECT max(x) FROM unnest(r1."segmentsIndex") x) + 1 = (SELECT min(y) FROM unnest(r2."segmentsIndex") y)
        LIMIT 1
        FOR UPDATE OF r1, r2 SKIP LOCKED
      `;

      if (!records || (records as Array<{}>).length === 0) return null;

      interface MergingQuery {
        id1: number;
        index1: Array<number>;
        file1: string;
        id2: number;
        index2: Array<number>;
        file2: string;
        userId: string;
      }
      const row: MergingQuery = (records as Array<MergingQuery>)[0];

      await tx.recordingQueue.updateMany({
        where: { id: { in: [row.id1, row.id2] } },
        data: {
          status: RecordingQueueState.MERGING,
          previousState: RecordingQueueState.ENCODED,
          startedAt: new Date(),
        },
      });

      return [
        {
          id: row.id1,
          fileName: row.file1,
          segmentsIndex: row.index1,
          userId: row.userId,
        },
        {
          id: row.id2,
          fileName: row.file2,
          segmentsIndex: row.index2,
          userId: row.userId,
        },
      ];
    });

    if (!pairData) break;

    const sortedSegments = pairData.sort((a, b) => {
      const minA = Math.min(...a.segmentsIndex);
      const minB = Math.min(...b.segmentsIndex);
      return minA - minB;
    });

    const isUsingS3 = sortedSegments[0].fileName.startsWith("s3://");
    const userId = sortedSegments[0].userId;

    const firstFileName = sortedSegments[0].fileName.replace("s3://", "");
    const firstLocalPath = join(
      process.env.RECORDINGS_PATH || "",
      "recordings",
      userId,
      firstFileName,
    );

    const secondFileName = sortedSegments[1].fileName.replace("s3://", "");
    const secondLocalPath = join(
      process.env.RECORDINGS_PATH || "",
      "recordings",
      userId,
      secondFileName,
    );

    try {
      if (isUsingS3) {
        await downloadFile(
          `recordings/${userId}/${firstFileName}`,
          firstLocalPath,
        );
        await downloadFile(
          `recordings/${userId}/${secondFileName}`,
          secondLocalPath,
        );
      }

      await mergeVideos(firstLocalPath, secondLocalPath);

      if (isUsingS3) {
        await uploadFile(
          `recordings/${userId}/${firstFileName}`,
          firstLocalPath,
          "video/mp4",
        );
        await uploadFile(
          `recordings/${userId}/${firstFileName.replace(".mp4", ".webp")}`,
          firstLocalPath.replace(".mp4", ".webp"),
          "image/webp",
        );

        try {
          rmSync(firstLocalPath);
          rmSync(firstLocalPath.replace(".mp4", ".webp"));
        } catch {}
      }

      await prisma.recordingQueue.update({
        where: {
          id: sortedSegments[0].id,
        },
        data: {
          status: RecordingQueueState.ENCODED,
          segmentsIndex: [
            ...sortedSegments[0].segmentsIndex,
            ...sortedSegments[1].segmentsIndex,
          ].sort((a, b) => a - b),
          finishedAt: new Date(),
          attempts: 0,
          errorMessage: null,
          errorState: null,
        },
      });

      await prisma.recordingQueue.update({
        where: {
          id: sortedSegments[1].id,
        },
        data: {
          status: RecordingQueueState.MERGED,
          previousState: RecordingQueueState.ENCODED,
          finishedAt: new Date(),
          attempts: 0,
          errorMessage: null,
          errorState: null,
        },
      });

      await deleteFile(
        `recordings/${userId}/${secondFileName}`,
        `recordings/${userId}/${secondFileName.replace(".mp4", ".webp")}`,
      );
    } catch (error) {
      console.error("mergingRecordings: ", error);
      try {
        rmSync(firstLocalPath);
        rmSync(firstLocalPath.replace(".mp4", ".webp"));
        rmSync(firstLocalPath.replace(".mp4", ".merged.mp4"));
        rmSync(secondLocalPath);
        rmSync(secondLocalPath.replace(".mp4", ".webp"));
      } catch {}
      return;
    }

    const recording = await prisma.recordingQueue.findUnique({
      where: {
        id: sortedSegments[0].id,
      },
    });

    const segmentIndicesCount = recording?.segmentsIndex.length;

    const recordingsCount = await prisma.recordingQueue.count({
      where: {
        firstSegmentId: recording?.firstSegmentId,
      },
    });

    const channelStatus = await prisma.channelStatus.findUnique({
      where: {
        userId: recording?.userId,
      },
    });

    if (segmentIndicesCount === recordingsCount) {
      const isCompleted =
        recording?.firstSegmentId !== channelStatus?.firstSegmentId ||
        !channelStatus?.isOnline;

      if (isCompleted) {
        await prisma.recordingQueue.update({
          where: {
            id: recording?.id,
          },
          data: {
            finishedAt: new Date(),
            previousState: RecordingQueueState.ENCODED,
            attempts: 0,
            errorMessage: null,
            errorState: null,
            status: RecordingQueueState.COMPLETED,
          },
        });
      }
    }
  }
};

const completedRecordings = async () => {
  const completedSessions = await prisma.recordingQueue.findMany({
    where: { status: RecordingQueueState.COMPLETED },
    select: { firstSegmentId: true },
  });

  const completedIds = completedSessions.map((s) => s.firstSegmentId);

  const stats = await prisma.recordingQueue.groupBy({
    by: ["userId", "firstSegmentId", "status"],
    _count: { _all: true },
    where: {
      firstSegmentId: {
        notIn: completedIds as Array<number>,
      },
    },
  });

  const sessions = stats.reduce<
    Record<
      string,
      {
        userId: string;
        ENCODED: number;
        MERGED: number;
        REST: number;
        totalRows: number;
      }
    >
  >((acc, curr) => {
    if (curr.firstSegmentId === null) return acc;

    const key = String(curr.firstSegmentId);

    if (!acc[key]) {
      acc[key] = {
        userId: curr.userId,
        ENCODED: 0,
        MERGED: 0,
        REST: 0,
        totalRows: 0,
      };
    }

    if (curr.status === "ENCODED") acc[key].ENCODED = curr._count._all;
    else if (curr.status === "MERGED") acc[key].MERGED = curr._count._all;
    else acc[key].REST += curr._count._all;

    acc[key].totalRows += curr._count._all;
    return acc;
  }, {});

  for (const [firstSegmentId, data] of Object.entries(sessions)) {
    if (data.REST > 0) {
      continue;
    }

    if (data.ENCODED === 1) {
      const recording = await prisma.recordingQueue.findFirst({
        where: {
          status: RecordingQueueState.ENCODED,
          userId: data.userId,
          firstSegmentId: Number(firstSegmentId),
        },
      });

      const segmentIndicesCount = recording?.segmentsIndex.length;

      const channelStatus = await prisma.channelStatus.findUnique({
        where: {
          userId: recording?.userId,
        },
      });

      if (segmentIndicesCount === data.totalRows) {
        const isCompleted =
          recording?.firstSegmentId !== channelStatus?.firstSegmentId ||
          !channelStatus?.isOnline;

        if (isCompleted) {
          await prisma.recordingQueue.update({
            where: {
              id: recording?.id,
            },
            data: {
              finishedAt: new Date(),
              previousState: RecordingQueueState.ENCODED,
              attempts: 0,
              errorMessage: null,
              errorState: null,
              status: RecordingQueueState.COMPLETED,
            },
          });
        }
      }
    }
  }
};

export const queueTask = async () => {
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

  console.info(`Running queueTask at ${new Date()}`);

  await updateLastExecutionFromSettings(JOB_RECORDING_QUEUE);

  await setPendingUploadedRecordings();

  await encodingRecordings();

  await mergingRecordings();

  await completedRecordings();
};
