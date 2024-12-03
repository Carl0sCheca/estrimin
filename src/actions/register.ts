"use server";

import {
  EmailError,
  ErrorType,
  NameError,
  RegisterResponse,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createChannel } from "./channel";
import { checkValidUsername } from "./user";

export const registerAction = async (
  email: string,
  password: string,
  name: string
) => {
  const response: RegisterResponse = {
    ok: false,
    errorType: ErrorType.Name,
  };

  if (name && !(await checkValidUsername(name))) {
    response.message = NameError.Invalid;
    return response;
  }

  if (
    await prisma.user.findFirst({
      where: {
        name,
      },
    })
  ) {
    response.message = NameError.InUse;
    response.errorType = ErrorType.Name;
    return response;
  }

  if (
    await prisma.user.findFirst({
      where: {
        email,
      },
    })
  ) {
    response.message = EmailError.InUse;
    response.errorType = ErrorType.Email;
    return response;
  }

  try {
    const user = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        role: "USER",
      },
    });

    if (!user) {
      response.errorType = ErrorType.Unknown;
      return response;
    }

    const session = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (session.user) {
      await createChannel(session.user);
    }

    response.ok = true;
    response.errorType = undefined;
  } catch {}

  return response;
};
