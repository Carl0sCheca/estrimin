"use server";

import {
  AddUserAllowlistRequest,
  AddUserAllowlistResponse,
  CreateChannelResponse,
  GetChannelRecordingsResponse,
  RecordingType,
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
import { RecordingQueueState, RecordingVisibility } from "@/generated/client";
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
      !!session?.user.id &&
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

    const queueRecordings = await prisma.recordingQueue.findMany({
      where: {
        createdAt: {
          gt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
        userId: channel.user.id,
      },
    });

    const nestedRecordings = Object.values(
      queueRecordings.reduce(
        (acc, curr) => {
          const key = curr.firstSegmentId;

          if (key === null) {
            return acc;
          }

          if (!acc[key]) {
            acc[key] = [];
          }

          acc[key].push(curr);

          return acc;
        },
        {} as Record<number, typeof queueRecordings>,
      ),
    );

    const groupByFirstSegment = nestedRecordings.flatMap((group) => {
      let hasCompleted = false;
      let hasRecording = false;

      const visibility = group[0]?.visibility;

      let start = group[0]?.createdAt ?? new Date(0);
      let duration = 0;

      let largerSegment = undefined;
      let largerSegmentId = undefined;
      let firstSegmentId = undefined;

      let fileName = undefined;

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
          fileName = item.fileName;
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
          fileName,
          largerSegmentId,
        },
      ];
    });

    response.recordings = groupByFirstSegment
      .filter((recording) => visibilitiesAllowed.includes(recording.visibility))
      .map(
        (recording): RecordingDto => ({
          date: recording.start,
          duration: secondsToHMS(recording.duration),
          status: recording.status,
          title: formatDate(recording.start, true),
          visibility: recording.visibility,
          url: `/videos/${channel.user.name}/${encodeURIComponent(
            btoa(
              JSON.stringify({
                i: recording.largerSegmentId,
                t: "n",
              }),
            ),
          )}`,
          thumbnail: `/api/videos/thumbnails/${
            channel.user.id
          }/n/${recording.largerSegmentId}`,
        }),
      );

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
      ...savedRecordings.map(
        (recording): RecordingDto => ({
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
        }),
      ),
    ];

    response.recordings = response.recordings.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    response.ok = true;
  } catch {}

  return response;
};
