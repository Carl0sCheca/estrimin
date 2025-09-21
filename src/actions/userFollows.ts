"use server";

import { SetUserFollowResponse, UserUnFollowResponse } from "@/interfaces";
import prisma from "@/lib/prisma";

export const SetUserFollowAction = async (
  userId: string,
  followUserId: string,
  following: boolean
): Promise<SetUserFollowResponse> => {
  const response: SetUserFollowResponse = {
    ok: false,
  };

  if (!userId || !followUserId) {
    return response;
  }

  if (userId === followUserId) {
    response.message = "You can't follow your own channel";
    return response;
  }

  try {
    const existingFollow = await prisma.userFollows.findUnique({
      where: {
        userId_followId: {
          userId,
          followId: followUserId,
        },
      },
    });

    if (following || !existingFollow) {
      await prisma.userFollows.create({
        data: {
          userId,
          followId: followUserId,
        },
      });

      response.following = true;
    } else if (!following && existingFollow) {
      await prisma.userFollows.delete({
        where: {
          userId_followId: {
            userId,
            followId: followUserId,
          },
        },
      });
      response.following = false;
    }

    response.ok = true;
  } catch {}

  return response;
};

export const UserUnFollowAction = async (
  userId: string,
  followUserName: string
): Promise<UserUnFollowResponse> => {
  const response: UserUnFollowResponse = {
    ok: false,
  };

  if (!userId || !followUserName) {
    return response;
  }

  try {
    const followUserId = (
      await prisma.user.findFirst({ where: { name: followUserName } })
    )?.id;

    if (!followUserId) {
      throw new Error("User not found");
    }

    const existingFollow = await prisma.userFollows.findUnique({
      where: {
        userId_followId: {
          userId,
          followId: followUserId,
        },
      },
    });

    if (existingFollow) {
      await prisma.userFollows.delete({
        where: {
          userId_followId: {
            userId,
            followId: followUserId,
          },
        },
      });
    }

    response.ok = true;
  } catch {}

  return response;
};
