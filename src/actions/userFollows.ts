"use server";

import { SetUserFollowResponse } from "@/interfaces";
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
