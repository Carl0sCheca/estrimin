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
  SaveRecordingResponse,
  USER_SETTING,
} from "@/interfaces";
import prisma from "@/lib/prisma";
import { UserChannel } from "@/app/(user)/channel/ui/channelSettingsForm";
import fs from "fs";
import path from "path";
import { RecordingQueue, RecordingVisibility } from "@prisma/client";
import { dateToFilename, getDateFromFileName } from "@/lib/utils-server";
import s3Client from "@/lib/s3-client";
import { deleteFile, moveFile } from "../../scheduler/src/S3Service";

export const getNonSavedRecordingsList = async (
  sessionId: string,
  userId: string
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

  if (
    !fs.existsSync(
      path.join(process.env.RECORDINGS_PATH || "", "recordings", userId)
    )
  ) {
    response.ok = true;
    return response;
  }

  const entriesDb = await prisma.recordingQueue.findMany({
    where: {
      createdAt: {
        gt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    },
  });

  const groupedBySegment = entriesDb.reduce(
    (groups: Record<number, RecordingQueue[]>, entry: RecordingQueue) => {
      const segmentId = entry.firstSegmentId;

      if (!segmentId) {
        return groups;
      }

      if (!groups[segmentId]) {
        groups[segmentId] = [];
      }

      groups[segmentId].push(entry);
      return groups;
    },
    {}
  );

  let filteredEntries: Array<RecordingData> = Object.entries(groupedBySegment)
    .map(([_, entries]): RecordingData | null => {
      const allCompleted = entries.every(
        (entry) => entry.status === "COMPLETED"
      );

      const sortedEntries = entries.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const totalDuration = entries.reduce((sum, entry) => {
        return sum + (entry.duration || 0);
      }, 0);

      if (allCompleted) {
        const oldestEntry = sortedEntries[0];
        return {
          fileName:
            oldestEntry.fileName.split("/").pop() || oldestEntry.fileName,
          status: "COMPLETED",
          start: oldestEntry.createdAt,
          duration: totalDuration,
          visibility: oldestEntry.visibility,
          firstSegmentId: oldestEntry.firstSegmentId ?? undefined,
        };
      } else {
        const validEntry = sortedEntries.find(
          (entry) => entry.status === "COMPLETED"
        );

        if (validEntry) {
          return {
            fileName:
              validEntry.fileName.split("/").pop() || validEntry.fileName,
            status: "PROCESSING",
            start: validEntry.createdAt,
            duration: totalDuration,
            visibility: validEntry.visibility,
            firstSegmentId: validEntry.firstSegmentId ?? undefined,
          };
        }
      }

      return null;
    })
    .filter((entry): entry is RecordingData => entry !== null);

  const recording = await getLastVideoFromLive(filteredEntries, userId);
  if (recording) {
    filteredEntries = filteredEntries.map((entry) => {
      if (entry.fileName.includes(recording)) {
        return { ...entry, status: "LIVE" };
      }
      return entry;
    });
  }

  response.recordings = filteredEntries;

  response.ok = true;

  return response;
};

export const getRecordingsListAction = async (
  userChannel: UserChannel,
  session: string
): Promise<GetRecordingsListResponse> => {
  const response: GetRecordingsListResponse = {
    ok: false,
    recordings: [],
  };

  const nonSavedRecordingsList = await getNonSavedRecordingsList(
    session,
    userChannel.user.id
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
              i: recording.fileName.replace(".mp4", ""),
              t: "n",
            })
          )
        )}`,
        visibility: recording.visibility,
        firstSegmentId: recording.firstSegmentId,
      })
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
              })
            )
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
  userChannel: UserChannel
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
              .replace(".mp4", ".webp")}`
          );
        } else {
          fs.rmSync(
            path.join(
              process.env.RECORDINGS_PATH || "",
              "recordings",
              videoRecording.userId,
              videoRecording.fileName
            )
          );
          fs.rmSync(
            path.join(
              process.env.RECORDINGS_PATH || "",
              "recordings",
              videoRecording.userId,
              videoRecording.fileName.replace(".mp4", ".webp")
            )
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
          `recordings_saved/${userChannel.user.id}/${recording.id}.webp`
        );
      } else {
        fs.rmSync(
          `${process.env.RECORDINGS_PATH}/recordings_saved/${userChannel.user.id}/${recording.id}.mp4`
        );
        fs.rmSync(
          `${process.env.RECORDINGS_PATH}/recordings_saved/${userChannel.user.id}/${recording.id}.webp`
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

export const getLastVideoFromLive = async (
  entries: Array<RecordingData>,
  userId: string
): Promise<string | null> => {
  const entriesDate = await Promise.all(
    entries.map(
      async (e) => await getDateFromFileName(e.fileName.replace(".mp4", ""))
    )
  );

  const request = await fetch(
    `${process.env.STREAM_API_URL}/v3/paths/get/${userId}` || ""
  );

  const responseReadyTime = (
    (await request.json()) as { readyTime: Date | null }
  ).readyTime;

  if (responseReadyTime) {
    return await dateToFilename(
      entriesDate.find((entryDate) => {
        const entryTime = new Date(entryDate).getTime();
        const readyTime = new Date(responseReadyTime).getTime();
        const timeDiff = Math.abs(entryTime - readyTime);
        return timeDiff <= 10000; // ±10s
      })
    );
  }

  return null;
};

export const saveRecordingAction = async (
  recording: Recording,
  userChannel: UserChannel,
  session: string
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
            `recordings_saved/${userChannel.user.id}/${recordingDb.id}.mp4`
          );
          await moveFile(
            `recordings/${userChannel.user.id}/${recordingQueueDb.fileName
              .replace("s3://", "")
              .replace(".mp4", ".webp")}`,
            `recordings_saved/${userChannel.user.id}/${recordingDb.id}.webp`
          );
        } else {
          const targetDir = `${process.env.RECORDINGS_PATH}/recordings_saved/${userChannel.user.id}`;
          const targetPath = `${targetDir}/${recordingDb.id}.mp4`;

          fs.mkdirSync(targetDir, { recursive: true });

          fs.renameSync(recordingQueueDb.fileName, targetPath);
          fs.renameSync(
            recordingQueueDb.fileName.replace(".mp4", ".webp"),
            targetPath.replace(".mp4", ".webp")
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
            })
          )
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
  userId: string
): Promise<ChangeDefaultRecordingVisibilityResponse> => {
  const response: ChangeDefaultRecordingVisibilityResponse = {
    ok: false,
  };

  try {
    await prisma.userSetting.upsert({
      where: {
        key: USER_SETTING.DEFAULT_VISIBILITY_UNSAVED_RECORDINGS,
        userId,
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
  visibility: RecordingVisibility
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
  title: string
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
  userId: string
): Promise<ChangeDefaultRecordingVisibilityResponse> => {
  const response: ChangeDefaultRecordingVisibilityResponse = {
    ok: false,
  };

  try {
    await prisma.userSetting.upsert({
      where: { key: USER_SETTING.STORE_PAST_STREAMS, userId },
      update: { value },
      create: { key: USER_SETTING.STORE_PAST_STREAMS, userId, value },
    });

    response.ok = true;
  } catch {}

  return response;
};
