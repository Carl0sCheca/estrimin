"use server";

import {
  ChangePasswordResponse,
  SITE_SETTING,
  UserUpdateDataRequest,
  UserUpdateResponse,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { headers } from "next/headers";
import { z } from "zod";

export const checkValidUsername = async (
  username: string
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
  request: UserUpdateDataRequest
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
    if (error instanceof PrismaClientKnownRequestError) {
      if (
        error.meta?.modelName === "User" &&
        (error.meta?.target as Array<string>).at(0) === "name"
      ) {
        response.message = "Username already exists";
      }
      if (
        error.meta?.modelName === "User" &&
        (error.meta?.target as Array<string>).at(0) === "email"
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
  currentPassword,
}: {
  newPassword: string;
  currentPassword: string;
}): Promise<ChangePasswordResponse> => {
  const response: ChangePasswordResponse = {
    ok: false,
  };

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
