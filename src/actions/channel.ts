"use server";

import {
  AddUserAllowlistRequest,
  AddUserAllowlistResponse,
  CreateChannelResponse,
  RemoveUserAllowlistRequest,
  RemoveUserAllowlistResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  UpdateWatchOnlyStatusRequest,
  UpdateWatchOnlyStatusResponse,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { User } from "better-auth";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export const createChannel = async (
  user: User | null = null
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
  request: UpdateWatchOnlyStatusRequest
): Promise<UpdateWatchOnlyStatusResponse> => {
  const response: UpdateWatchOnlyStatusResponse = { ok: false };

  if (!request) {
    return response;
  }

  try {
    if (
      await prisma.channel.update({
        where: { id: request.channelId },
        data: { watchOnly: request.state },
      })
    ) {
      response.ok = true;
    }
  } catch {}

  return response;
};

export const setPasswordChannelAction = async (
  request: SetPasswordRequest
): Promise<SetPasswordResponse> => {
  const response: SetPasswordResponse = { ok: false };

  if (
    await prisma.channel.update({
      where: { id: request.channelId },
      data: {
        watchOnlyPassword: request.password,
      },
    })
  ) {
    response.ok = true;
  }

  return response;
};

export const addUserAllowlistAction = async (
  request: AddUserAllowlistRequest
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
  request: RemoveUserAllowlistRequest
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
