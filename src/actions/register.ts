"use server";

import {
  EmailError,
  ErrorType,
  IsRegisterDisabledActionResponse,
  NameError,
  RegisterResponse,
  RegistrationCodeError,
  SITE_SETTING,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createChannel } from "./channel";
import { checkValidUsername } from "./user";

export const registerAction = async (
  email: string,
  password: string,
  name: string,
  registrationCode: string | undefined,
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
    if (registrationCode) {
      const validCode = await prisma.registrationCode.findFirst({
        where: { id: registrationCode },
      });

      if (
        !validCode ||
        validCode.used ||
        (validCode.expirationDate && validCode.expirationDate < new Date())
      ) {
        if (
          validCode &&
          validCode.expirationDate &&
          validCode.expirationDate < new Date()
        ) {
          response.message = RegistrationCodeError.Expired;
        } else {
          response.message = RegistrationCodeError.Invalid;
        }

        response.errorType = ErrorType.RegistrationCode;
        return response;
      }
    }

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

    if (registrationCode) {
      await prisma.registrationCode.update({
        where: {
          id: registrationCode,
        },
        data: {
          used: true,
          usedById: session.user.id,
        },
      });
    }

    response.ok = true;
    response.errorType = undefined;
  } catch {}

  return response;
};

export const isRegisterDisabledAction =
  async (): Promise<IsRegisterDisabledActionResponse> => {
    const response: IsRegisterDisabledActionResponse = {
      ok: true,
    };

    response.ok =
      ((
        await prisma.siteSetting.findUnique({
          where: { key: SITE_SETTING.DISABLE_REGISTER },
        })
      )?.value as boolean) ?? true;

    return response;
  };
