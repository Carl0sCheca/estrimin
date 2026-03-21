"use server";

import { ChannelVisibility } from "@/generated/enums";
import {
  ChangePasswordResponse,
  SITE_SETTING,
  LiveUserFollowingResponse,
  UserUpdateDataRequest,
  UserUpdateResponse,
  UserFollowingListResponse,
  UserFollowingLiveChannelItem,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

interface PrismaError {
  meta?: {
    modelName?: string;
    driverAdapterError?: {
      cause?: {
        constraint?: {
          fields: Array<string>;
        };
      };
    };
  };
}

export const checkValidUsername = async (
  username: string,
): Promise<boolean> => {
  let result = false;

  const forbiddenNames = await prisma.siteSetting.findFirst({
    where: { key: SITE_SETTING.FORBIDDEN_NAMES },
  });

  if (!forbiddenNames) {
    return result;
  }

  const forbiddenNamesList = forbiddenNames.value as string[];
  const regex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

  const usernameSchema = z
    .string()
    .refine((val) => !forbiddenNamesList.includes(val), {
      message: "The string cannot be one of the forbidden names.",
    })
    .refine((val) => regex.test(val), {
      message:
        "The string must start with a letter and can only contain letters, numbers, underscores (_), or hyphens (-) after the first character.",
    })
    .refine((val) => val.length >= 3, {
      message: "The string must be at least 3 characters long.",
    });

  result = usernameSchema.safeParse(username).success;

  return result;
};

export const updateUser = async (
  request: UserUpdateDataRequest,
): Promise<UserUpdateResponse> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response: UserUpdateResponse = {
    ok: false,
  };

  if (!session?.user) {
    response.message = "Session not found";
    return response;
  }

  let validEmail = false;
  if (request?.email) {
    const emailSchema = z.string().email();
    validEmail = emailSchema.safeParse(request.email).success;

    if (!validEmail) {
      response.message = "Invalid email";
      return response;
    }
  }

  if (request.name && !(await checkValidUsername(request.name))) {
    response.message = "Invalid name";
    return response;
  }

  let updatedUser = null;

  try {
    updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: request,
    });
  } catch (error) {
    const prismaError: PrismaError = error as PrismaError;

    if (prismaError) {
      if (
        prismaError.meta?.modelName === "User" &&
        (
          prismaError.meta?.driverAdapterError?.cause?.constraint
            ?.fields as Array<string>
        ).at(0) === "name"
      ) {
        response.message = "Username already exists";
      }
      if (
        prismaError.meta?.modelName === "User" &&
        (
          prismaError.meta?.driverAdapterError?.cause?.constraint
            ?.fields as Array<string>
        ).at(0) === "email"
      ) {
        response.message = "Email already exists";
      }
    }
  }

  if (updatedUser) {
    response.ok = true;
    response.data = updatedUser;
  }

  return response;
};

export const changePasswordAction = async ({
  newPassword,
  repeatNewPassword,
  currentPassword,
}: {
  newPassword: string;
  repeatNewPassword: string;
  currentPassword: string;
}): Promise<ChangePasswordResponse> => {
  const response: ChangePasswordResponse = {
    ok: false,
  };

  if (newPassword !== repeatNewPassword) {
    response.error = "NEWPASSWORD_NOT_EQUAL";
    return response;
  }

  if (newPassword === currentPassword) {
    response.error = "SAME_OLD_PASSWORD";
    return response;
  }

  const changePassword = await auth.api.changePassword({
    headers: await headers(),
    asResponse: true,
    returnHeaders: true,
    method: "POST",
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    },
  });

  const changePasswordResponse = await changePassword.json();

  if (changePassword.status === 200) {
    response.ok = true;

    await auth.api.revokeOtherSessions({
      headers: await headers(),
    });
  } else {
    response.error = changePasswordResponse.code;
  }

  return response;
};

const ALLOWED_VISIBILITIES = [
  ChannelVisibility.ALL,
  ChannelVisibility.ALLOWLIST,
  ChannelVisibility.REGISTERED_USERS,
] as const;

const PUBLIC_VISIBILITIES = [
  ChannelVisibility.ALL,
  ChannelVisibility.REGISTERED_USERS,
] as const;

const isVisibilityAllowed = (
  visibility: ChannelVisibility,
  visibilities: readonly ChannelVisibility[],
): boolean => visibilities.includes(visibility);

export const liveFollowingListAction =
  async (): Promise<LiveUserFollowingResponse> => {
    const response: LiveUserFollowingResponse = {
      ok: false,
      following: [],
    };

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return response;
    }

    try {
      const followingList = (
        await prisma.userFollows.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            followed: { select: { name: true, id: true } },
          },
        })
      ).map((following) => following.followed);

      const streamRequest = await fetch(
        `${process.env.STREAM_API_URL}/v3/paths/list`,
        {
          method: "GET",
        },
      );

      if (!streamRequest.ok) {
        return response;
      }

      const streamData = await streamRequest.json();
      if (!streamData?.items) {
        return response;
      }

      const liveChannels = streamData.items.map(
        (item: {
          name: string;
          ready: boolean;
          readyTime: Date;
          readers: [];
        }) => ({
          id: item.name.split("/").pop(),
          ready: item.ready,
          readyTime: item.readyTime,
          viewers: item.readers.length,
        }),
      ) as Array<UserFollowingLiveChannelItem>;

      const allChannels = await prisma.channel.findMany({
        select: {
          userId: true,
          user: { select: { name: true } },
          visibility: true,
        },
        where: {
          userId: {
            in: followingList.map((fl) => fl.id),
          },
        },
      });

      const channelMap = new Map(
        allChannels.map((ch) => [
          ch.userId,
          { name: ch.user.name, visibility: ch.visibility },
        ]),
      );

      const allowList = await prisma.channelAllowList.findMany({
        select: {
          Channel: {
            select: {
              userId: true,
              user: { select: { name: true } },
              visibility: true,
            },
          },
        },
        where: {
          userId: session.user.id,
          Channel: {
            userId: {
              in: followingList.map((fl) => fl.id),
            },
          },
        },
      });

      const allowlistMap = new Map(
        allowList
          .filter((item) =>
            isVisibilityAllowed(item.Channel.visibility, ALLOWED_VISIBILITIES),
          )
          .map((item) => [item.Channel.userId, item.Channel.user.name]),
      );

      const filteredElements = liveChannels
        .map((channel) => {
          const allowlistName = allowlistMap.get(channel.id);
          if (allowlistName) {
            return { ...channel, id: allowlistName };
          }

          const channelInfo = channelMap.get(channel.id);
          if (
            channelInfo &&
            isVisibilityAllowed(channelInfo.visibility, PUBLIC_VISIBILITIES)
          ) {
            return { ...channel, id: channelInfo.name };
          }

          return null;
        })
        .filter((item): item is UserFollowingLiveChannelItem => item !== null);

      response.following = filteredElements;
      response.ok = true;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error("Error in liveFollowingListAction:", error);
      }
    }

    return response;
  };

export const followingListAction =
  async (): Promise<UserFollowingListResponse> => {
    const response: UserFollowingListResponse = {
      ok: false,
      following: [],
    };

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    try {
      const followingList = await prisma.userFollows.findMany({
        where: {
          userId: session?.user.id,
        },
        select: {
          followed: { select: { name: true } },
        },
      });

      response.ok = true;
      response.following = followingList.map(
        (following) => following.followed.name,
      );
    } catch {}

    return response;
  };
