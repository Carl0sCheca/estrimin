"use server";

import {
  AddUserAllowlistRequest,
  AddUserAllowlistResponse,
  CreateChannelResponse,
  GetChannelRecordingsResponse,
  RecordingData,
  RemoveUserAllowlistRequest,
  RemoveUserAllowlistResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  UpdateVisibilityStatusRequest,
  UpdateVisibilityStatusResponse,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { User } from "better-auth";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { UserChannel } from "@/app/(user)/channel/ui/channelSettingsForm";
import { getLastVideoFromLive } from ".";
import { RecordingQueue, RecordingVisibility } from "@/generated/client";
import { RecordingDto } from "@/interfaces/api/channel";
import { formatDate, secondsToHMS } from "@/lib/utils";

export const createChannel = async (
  user: User | null = null,
): Promise<CreateChannelResponse> => {
  const response: CreateChannelResponse = {
    ok: false,
  };

  if (!user) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      user = session.user;
    } else {
      return response;
    }
  }

  const token = Buffer.from(uuidv4()).toString("base64url");

  const channel = await prisma.channel.upsert({
    where: { userId: user.id },
    update: {
      token,
    },
    create: {
      token,
      userId: user.id,
    },
  });

  if (channel) {
    response.data = token;
    response.ok = true;
  }

  return response;
};

export const changeWatchStreamsStateAction = async (
  request: UpdateVisibilityStatusRequest,
): Promise<UpdateVisibilityStatusResponse> => {
  const response: UpdateVisibilityStatusResponse = { ok: false };

  if (!request) {
    return response;
  }

  try {
    if (
      await prisma.channel.update({
        where: { id: request.channelId },
        data: { visibility: request.state },
      })
    ) {
      response.ok = true;
    }
  } catch {}

  return response;
};

export const setPasswordChannelAction = async (
  request: SetPasswordRequest,
): Promise<SetPasswordResponse> => {
  const response: SetPasswordResponse = { ok: false };

  if (
    await prisma.channel.update({
      where: { id: request.channelId },
      data: {
        visibilityPassword: request.password,
      },
    })
  ) {
    response.ok = true;
  }

  return response;
};

export const addUserAllowlistAction = async (
  request: AddUserAllowlistRequest,
): Promise<AddUserAllowlistResponse> => {
  const response: AddUserAllowlistResponse = { ok: false };

  if (!request.username) {
    response.message = "Empty username";
    return response;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { name: request.username },
      select: { id: true },
    });

    if (!user) {
      response.message = `User "${request.username}" not found`;
      return response;
    }

    if (request.requestedBy.toLowerCase() === request.username.toLowerCase()) {
      response.message = "You cannot add yourself to the list";
      return response;
    }

    const channelList = await prisma.channelAllowList.findFirst({
      where: { channelId: request.channelId, userId: user.id },
    });

    if (channelList) {
      response.message = `The user '${request.username}' is already in the list`;
      return response;
    }

    const channelUpdated = await prisma.channelAllowList.upsert({
      create: { channelId: request.channelId, userId: user.id },
      update: { channelId: request.channelId, userId: user.id },
      where: {
        channelId_userId: { channelId: request.channelId, userId: user.id },
      },
      select: {
        id: true,
        channelId: true,
        userId: true,
        user: { select: { name: true } },
      },
    });

    if (channelUpdated) {
      response.data = {
        channelId: channelUpdated.channelId,
        id: channelUpdated.id,
        userId: channelUpdated.userId,
        user: { name: channelUpdated.user.name },
      };
      response.ok = true;
    }
  } catch {}

  return response;
};

export const removeUserAllowlistAction = async (
  request: RemoveUserAllowlistRequest,
): Promise<RemoveUserAllowlistResponse> => {
  const response: RemoveUserAllowlistResponse = {
    ok: false,
  };

  try {
    await prisma.channelAllowList.delete({ where: { id: request.id } });
    response.ok = true;
  } catch {}

  return response;
};

export const getChannelRecordingsAction = async (
  channel: UserChannel,
): Promise<GetChannelRecordingsResponse> => {
  const response: GetChannelRecordingsResponse = {
    ok: false,
    recordings: [],
  };

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userAllowed =
      session?.user.id &&
      !!(await prisma.channelAllowList.findFirst({
        where: {
          userId: session.user.id,
          channelId: channel.id,
        },
      }));

    const visibilitiesAllowed =
      session?.user.id === channel.user.id
        ? Object.values(RecordingVisibility)
        : userAllowed
          ? [RecordingVisibility.PUBLIC, RecordingVisibility.ALLOWLIST]
          : [RecordingVisibility.PUBLIC];

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
      {},
    );

    let filteredEntries: Array<RecordingData> = Object.entries(groupedBySegment)
      .map(([_, entries]): RecordingData | null => {
        const allCompleted = entries.every(
          (entry) => entry.status === "COMPLETED",
        );

        const sortedEntries = entries.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
            (entry) => entry.status === "COMPLETED",
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

    const recording = await getLastVideoFromLive(
      filteredEntries,
      channel.user.id,
    );

    if (recording) {
      filteredEntries = filteredEntries.map((entry) => {
        if (entry.fileName.includes(recording)) {
          return { ...entry, status: "LIVE" };
        }
        return entry;
      });
    }

    const publicRecordings = filteredEntries.filter((entry) =>
      visibilitiesAllowed.includes(entry.visibility),
    );

    response.recordings = publicRecordings.map((recording) => {
      const recordingMap: RecordingDto = {
        date: recording.start,
        duration: secondsToHMS(recording.duration),
        status: recording.status,
        title: formatDate(recording.start, true),
        visibility: recording.visibility,
        url: `/videos/${channel.user.name}/${encodeURIComponent(
          btoa(
            JSON.stringify({
              i: recording.fileName.replace(".mp4", ""),
              t: "n",
            }),
          ),
        )}`,
        thumbnail: `/api/videos/thumbnails/${
          channel.user.id
        }/n/${recording.fileName.replace(".mp4", "")}`,
      };

      return recordingMap;
    });

    const savedRecordings = await prisma.recordingSaved.findMany({
      where: {
        channel: {
          userId: channel.user.id,
        },
        visibility: {
          in: visibilitiesAllowed,
        },
      },
    });

    response.recordings = [
      ...response.recordings,
      ...savedRecordings.map((recording) => {
        const recordingMap: RecordingDto = {
          date: recording.createdAt,
          duration: secondsToHMS(recording.duration),
          status: "SAVED",
          title: recording.title || formatDate(recording.createdAt, true),
          visibility: recording.visibility,
          url: `/videos/${channel.user.name}/${encodeURIComponent(
            btoa(
              JSON.stringify({
                i: recording.id,
                t: "s",
              }),
            ),
          )}`,
          thumbnail: `/api/videos/thumbnails/${channel.user.id}/s/${recording.id}`,
        };

        return recordingMap;
      }),
    ];

    response.recordings = response.recordings.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    response.ok = true;
  } catch {}

  return response;
};
