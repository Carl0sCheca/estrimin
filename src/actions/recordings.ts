"use server";

import {
  ChangeDefaultRecordingVisibilityResponse,
  ChangeRecordingTitleResponse,
  ChangeRecordingVisibilityResponse,
  DeleteRecordingResponse,
  GetNonSavedRecordingsListResponse,
  GetRecordingsListResponse,
  Recording,
  RecordingData,
  RecordingType,
  SaveRecordingResponse,
  USER_SETTING,
} from "@/interfaces";
import prisma from "@/lib/prisma";
import { UserChannel } from "@/app/(user)/channel/ui/channelSettingsForm";
import fs from "fs";
import path from "path";
import { RecordingQueueState, RecordingVisibility } from "@/generated/client";
import s3Client from "@/lib/s3-client";
import { deleteFile, moveFile } from "@scheduler/services/s3.service";

export const getNonSavedRecordingsList = async (
  sessionId: string,
  userId: string,
): Promise<GetNonSavedRecordingsListResponse> => {
  const response: GetNonSavedRecordingsListResponse = {
    ok: false,
    recordings: [],
  };

  try {
    const userSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
      },
    });

    if (userSession?.userId !== userId) {
      response.message = "Forbidden";
      return response;
    }
  } catch {
    response.message = "Forbidden";
    return response;
  }

  const groupedRecordings = await prisma.recordingQueue.groupBy({
    by: [
      "userId",
      "firstSegmentId",
      "status",
      "id",
      "createdAt",
      "duration",
      "segmentsIndex",
      "visibility",
    ],
    where: {
      userId,
    },
    _count: { _all: true },
  });

  const nestedRecordings = Object.values(
    groupedRecordings.reduce(
      (acc, curr) => {
        const key = curr.firstSegmentId;

        if (!key) {
          return acc;
        }

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(curr);

        return acc;
      },
      {} as Record<number, typeof groupedRecordings>,
    ),
  );
  const groupByFirstSegment: Array<{
    firstSegmentId: number | undefined;
    status: RecordingType;
    start: Date;
    largerSegmentId: number | undefined;
    duration: number;
    visibility: RecordingVisibility;
  }> = nestedRecordings.flatMap((group) => {
    let hasCompleted = false;
    let hasRecording = false;

    const visibility = group[0]?.visibility;

    let start = group[0]?.createdAt ?? new Date(0);
    let duration = 0;

    let largerSegment = undefined;
    let largerSegmentId = undefined;
    let firstSegmentId = undefined;

    for (const item of group) {
      if (item.status === RecordingQueueState.COMPLETED) {
        hasCompleted = true;
      } else if (item.status === RecordingQueueState.RECORDING) {
        hasRecording = true;
      }

      duration += item.duration;

      firstSegmentId = item.firstSegmentId ?? undefined;

      if (item.createdAt < start) {
        start = item.createdAt;
      }

      const isEncoded =
        item.status === RecordingQueueState.COMPLETED ||
        item.status === RecordingQueueState.ENCODED;

      if (
        isEncoded &&
        (largerSegment === undefined ||
          item.segmentsIndex.length > largerSegment)
      ) {
        largerSegment = item.segmentsIndex.length;
        largerSegmentId = item.id;
      }
    }

    if (largerSegmentId === undefined) {
      return [];
    }

    const status: RecordingType = hasCompleted
      ? "COMPLETED"
      : hasRecording
        ? "LIVE"
        : "PROCESSING";

    return [
      {
        firstSegmentId,
        status,
        start,
        duration,
        visibility,
        largerSegmentId,
      },
    ];
  });

  response.recordings = groupByFirstSegment;

  response.ok = true;

  return response;
};

export const getRecordingsListAction = async (
  userChannel: UserChannel,
  session: string,
): Promise<GetRecordingsListResponse> => {
  const response: GetRecordingsListResponse = {
    ok: false,
    recordings: [],
  };

  const nonSavedRecordingsList = await getNonSavedRecordingsList(
    session,
    userChannel.user.id,
  );

  if (nonSavedRecordingsList.ok) {
    response.recordings = nonSavedRecordingsList.recordings.map(
      (recording: RecordingData) => ({
        duration: recording.duration,
        start: recording.start,
        type: recording.status,
        url: `videos/${userChannel.user.name}/${encodeURIComponent(
          btoa(
            JSON.stringify({
              i: recording.largerSegmentId,
              t: "n",
            }),
          ),
        )}`,
        visibility: recording.visibility,
        firstSegmentId: recording.firstSegmentId,
      }),
    );

    response.ok = true;
  }

  try {
    const savedRecordings = await prisma.recordingSaved.findMany({
      where: { channel: { userId: userChannel.user.id } },
    });

    response.recordings = [
      ...response.recordings,
      ...savedRecordings.map((r) => {
        return {
          start: r.createdAt,
          url: `videos/${userChannel.user.name}/${encodeURIComponent(
            btoa(
              JSON.stringify({
                i: r.id,
                t: "s",
              }),
            ),
          )}`,
          type: "SAVED",
          duration: r.duration,
          id: r.id,
          visibility: r.visibility,
          title: r.title ?? undefined,
        } satisfies Recording;
      }),
    ];

    response.ok = true;
  } catch (error) {
    console.error("getRecordingsListAction:", error);
  }

  if (response.ok) {
    response.recordings.sort((a, b) => {
      return +new Date(b.start) - +new Date(a.start);
    });
  }

  return response;
};

export const deleteRecordingAction = async (
  recording: Recording,
  userChannel: UserChannel,
): Promise<DeleteRecordingResponse> => {
  const response: DeleteRecordingResponse = {
    ok: false,
  };

  const isUsingS3Bucket = s3Client !== null;

  if (recording?.type === "COMPLETED") {
    try {
      const videoRecording = await prisma.recordingQueue.findFirst({
        where: { createdAt: recording.start },
      });

      if (!videoRecording) {
        response.message = "Video not found";
        return response;
      }

      try {
        if (isUsingS3Bucket) {
          await deleteFile(
            `recordings/${
              videoRecording.userId
            }/${videoRecording.fileName.replace("s3://", "")}`,
            `recordings/${videoRecording.userId}/${videoRecording.fileName
              .replace("s3://", "")
              .replace(".mp4", ".webp")}`,
          );
        } else {
          fs.rmSync(
            path.join(
              process.env.RECORDINGS_PATH || "",
              "recordings",
              videoRecording.userId,
              videoRecording.fileName,
            ),
          );
          fs.rmSync(
            path.join(
              process.env.RECORDINGS_PATH || "",
              "recordings",
              videoRecording.userId,
              videoRecording.fileName.replace(".mp4", ".webp"),
            ),
          );
        }

        await prisma.recordingQueue.deleteMany({
          where: { firstSegmentId: videoRecording?.firstSegmentId },
        });
      } catch {}

      response.ok = true;
    } catch {
      response.message = "Unexpected error";
    }
  } else if (recording.type === "SAVED" && recording.id) {
    try {
      if (isUsingS3Bucket) {
        await deleteFile(
          `recordings_saved/${userChannel.user.id}/${recording.id}.mp4`,
          `recordings_saved/${userChannel.user.id}/${recording.id}.webp`,
        );
      } else {
        fs.rmSync(
          `${process.env.RECORDINGS_PATH}/recordings_saved/${userChannel.user.id}/${recording.id}.mp4`,
        );
        fs.rmSync(
          `${process.env.RECORDINGS_PATH}/recordings_saved/${userChannel.user.id}/${recording.id}.webp`,
        );
      }

      await prisma.recordingSaved.delete({ where: { id: recording.id } });

      response.ok = true;
    } catch {}
  } else {
    response.message =
      "Recording cannot be deleted right now because it's currently being processed. Please try again later";
  }

  return response;
};

export const saveRecordingAction = async (
  recording: Recording,
  userChannel: UserChannel,
  session: string,
): Promise<SaveRecordingResponse> => {
  const response: SaveRecordingResponse = {
    ok: false,
  };

  try {
    const userSession = await prisma.session.findUnique({
      where: { id: session },
      select: {
        userId: true,
      },
    });

    if (userSession?.userId !== userChannel.user.id) {
      response.message = "Forbidden";
      return response;
    }
  } catch {
    response.message = "Forbidden";
    return response;
  }

  if (recording.type === "COMPLETED") {
    const recordingQueueDb = await prisma.recordingQueue.findFirst({
      where: { createdAt: recording.start },
    });

    if (!recordingQueueDb) {
      return response;
    }

    const recordingDb = await prisma.recordingSaved.create({
      data: {
        createdAt: recording.start,
        channelId: userChannel.id,
        duration: recording.duration,
        visibility: recording.visibility,
      },
    });

    if (recordingDb) {
      try {
        const isUsingS3Bucket = s3Client !== null;

        if (isUsingS3Bucket) {
          await moveFile(
            `recordings/${
              userChannel.user.id
            }/${recordingQueueDb.fileName.replace("s3://", "")}`,
            `recordings_saved/${userChannel.user.id}/${recordingDb.id}.mp4`,
          );
          await moveFile(
            `recordings/${userChannel.user.id}/${recordingQueueDb.fileName
              .replace("s3://", "")
              .replace(".mp4", ".webp")}`,
            `recordings_saved/${userChannel.user.id}/${recordingDb.id}.webp`,
          );
        } else {
          const targetDir = `${process.env.RECORDINGS_PATH}/recordings_saved/${userChannel.user.id}`;
          const targetPath = `${targetDir}/${recordingDb.id}.mp4`;

          fs.mkdirSync(targetDir, { recursive: true });

          fs.renameSync(recordingQueueDb.fileName, targetPath);
          fs.renameSync(
            recordingQueueDb.fileName.replace(".mp4", ".webp"),
            targetPath.replace(".mp4", ".webp"),
          );
        }

        await prisma.recordingQueue.deleteMany({
          where: { firstSegmentId: recording.firstSegmentId },
        });
      } catch (error) {
        await prisma.recordingSaved.delete({ where: { id: recordingDb.id } });
        throw new Error("Error saving video: " + error);
      }

      response.recording = {
        ...recording,
        type: "SAVED",
        id: recordingDb.id,
        url: `videos/${userChannel.user.name}/${encodeURIComponent(
          btoa(
            JSON.stringify({
              i: recordingDb.id,
              d: recording.duration,
              t: "s",
            }),
          ),
        )}`,
      };
      response.ok = true;
    }
  } else {
    response.message = "Please wait until the recording is processed";
  }

  return response;
};

export const changeDefaultRecordingVisibilityAction = async (
  value: RecordingVisibility,
  userId: string,
): Promise<ChangeDefaultRecordingVisibilityResponse> => {
  const response: ChangeDefaultRecordingVisibilityResponse = {
    ok: false,
  };

  try {
    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          key: USER_SETTING.DEFAULT_VISIBILITY_UNSAVED_RECORDINGS,
          userId,
        },
      },
      update: { value },
      create: {
        key: USER_SETTING.DEFAULT_VISIBILITY_UNSAVED_RECORDINGS,
        userId,
        value,
      },
    });

    response.ok = true;
  } catch {}

  return response;
};

export const changeRecordingVisibility = async (
  recording: Recording,
  visibility: RecordingVisibility,
): Promise<ChangeRecordingVisibilityResponse> => {
  const response: ChangeRecordingVisibilityResponse = {
    ok: false,
  };

  try {
    if (recording.type !== "SAVED") {
      await prisma.recordingQueue.updateMany({
        where: { firstSegmentId: recording.firstSegmentId },
        data: {
          visibility,
        },
      });
    } else {
      await prisma.recordingSaved.update({
        where: {
          id: recording.id,
        },
        data: {
          visibility,
        },
      });
    }
    response.ok = true;
  } catch {
    response.message = "Unexpected error";
  }

  return response;
};

export const changeRecordingTitle = async (
  recordingId: string | null,
  title: string,
): Promise<ChangeRecordingTitleResponse> => {
  const response: ChangeRecordingTitleResponse = {
    ok: false,
  };

  if (!recordingId) {
    response.message = "Recording id is null";
    return response;
  }

  try {
    await prisma.recordingSaved.update({
      where: { id: recordingId },
      data: {
        title,
      },
    });

    response.ok = true;
  } catch {
    response.message = "Unexpected error";
  }

  return response;
};

export const storePastStreamsAction = async (
  value: boolean,
  userId: string,
): Promise<ChangeDefaultRecordingVisibilityResponse> => {
  const response: ChangeDefaultRecordingVisibilityResponse = {
    ok: false,
  };

  try {
    await prisma.userSetting.upsert({
      where: { userId_key: { key: USER_SETTING.STORE_PAST_STREAMS, userId } },
      update: { value },
      create: { key: USER_SETTING.STORE_PAST_STREAMS, userId, value },
    });

    response.ok = true;
  } catch {}

  return response;
};
