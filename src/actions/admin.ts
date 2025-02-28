"use server";

import {
  ChangeUserRoleResponse,
  DeleteRegistrationCodesResponse,
  DisableRegisterResponse,
  GenerateRegistrationCodeRequest,
  GenerateRegistrationCodeResponse,
  GetLiveChannelsResponse,
  GetRegistrationCodesResponse,
  LiveChannelItem,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export const disableRegistration = async (
  enabled: boolean
): Promise<DisableRegisterResponse> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response: DisableRegisterResponse = {
    ok: false,
  };

  if (!session?.user) {
    response.message = "Session not found";
    return response;
  }

  if (session.user.role !== "ADMIN") {
    response.message = "Forbidden user";
    return response;
  }

  try {
    const updateSettings = await prisma.setting.update({
      where: { name: "DISABLE_REGISTER" },
      data: {
        value: JSON.stringify(enabled),
      },
    });

    if (updateSettings) {
      response.ok = true;
    }
  } catch {
    response.message = "An error has ocurred";
  }

  return response;
};

export const changeUserRoleAction = async (
  user: string
): Promise<ChangeUserRoleResponse> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response: ChangeUserRoleResponse = {
    ok: false,
  };

  if (!session?.user) {
    response.message = "Session not found";
    return response;
  }

  if (session.user.role !== "ADMIN") {
    response.message = "Forbidden user";
    return response;
  }

  try {
    const userDb = await prisma.user.findFirst({ where: { name: user } });

    if (!userDb) {
      response.message = "User not found";
      return response;
    }
    const newRole = userDb.role === "ADMIN" ? "USER" : "ADMIN";

    const updatedUser = await prisma.user.update({
      where: { id: userDb.id },
      data: {
        role: newRole,
      },
    });

    if (updatedUser) {
      response.ok = true;
      response.newRole = newRole;
    }
  } catch {
    response.message = "An error has ocurred";
  }

  return response;
};

export const generateRegistrationCode = async (
  request: GenerateRegistrationCodeRequest
): Promise<GenerateRegistrationCodeResponse> => {
  const response: GenerateRegistrationCodeResponse = {
    ok: false,
  };

  const registrationCode = await prisma.registrationCodes.create({
    data: {
      expirationDate: request.expirationDate,
    },
  });

  if (!registrationCode) {
    return response;
  }

  response.expirationDate = registrationCode.expirationDate;
  response.ok = true;
  response.id = registrationCode.id;

  return response;
};

export const getRegistrationCodesAction =
  async (): Promise<GetRegistrationCodesResponse> => {
    const response: GetRegistrationCodesResponse = {
      ok: false,
    };

    const registrationCodes = await prisma.registrationCodes.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        used: true,
        id: true,
        expirationDate: true,
        user: { select: { name: true } },
      },
    });

    if (!registrationCodes) {
      return response;
    }

    response.registrationCodes = registrationCodes;
    response.ok = true;

    return response;
  };

export const deleteRegistrationCodesAction = async (
  id: string
): Promise<DeleteRegistrationCodesResponse> => {
  const response: DeleteRegistrationCodesResponse = {
    ok: false,
  };

  try {
    await prisma.registrationCodes.delete({
      where: { id },
    });
  } catch {
    return response;
  }

  response.ok = true;

  return response;
};

export const getLiveChannelsAction =
  async (): Promise<GetLiveChannelsResponse> => {
    const response: GetLiveChannelsResponse = {
      items: [],
    };

    const request = await fetch(`${process.env.STREAM_API_URL}/v3/paths/list`, {
      method: "GET",
    });

    if (request.ok) {
      const responseApi = await request.json();
      if (responseApi) {
        response.items = responseApi.items.map((i: LiveChannelItem) => {
          return { name: i.name, ready: i.ready, readyTime: i.readyTime };
        });
      }
    }

    return response;
  };
