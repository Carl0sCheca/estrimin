"use server";

import {
  ChangeUserRoleResponse,
  DeleteRegistrationCodesResponse,
  DisableRegisterResponse,
  GenerateRegistrationCodeRequest,
  GenerateRegistrationCodeResponse,
  GetLiveChannelsResponse,
  GetRegistrationCodesResponse,
  SITE_SETTING,
} from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export const disableRegistrationAction = async (
  enabled: boolean
): Promise<DisableRegisterResponse> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response: DisableRegisterResponse = {
    ok: false,
  };

  const isAdmin = await checkAdmin(session?.session.id);

  if (!isAdmin.ok) {
    response.message = isAdmin.message;
    return response;
  }

  try {
    const updateSettings = await prisma.siteSetting.update({
      where: { key: SITE_SETTING.DISABLE_REGISTER },
      data: {
        value: enabled,
      },
    });

    if (updateSettings) {
      response.ok = true;

      revalidatePath("/admin");
      revalidatePath("/login");
    }
  } catch {
    response.message = "An error has occurred";
  }

  return response;
};

export const disableRecordingsAction = async (
  enabled: boolean
): Promise<DisableRegisterResponse> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response: DisableRegisterResponse = {
    ok: false,
  };

  const isAdmin = await checkAdmin(session?.session.id);

  if (!isAdmin.ok) {
    response.message = isAdmin.message;
    return response;
  }

  try {
    const updateSettings = await prisma.siteSetting.update({
      where: { key: SITE_SETTING.DISABLE_RECORDINGS },
      data: {
        value: enabled,
      },
    });

    if (updateSettings) {
      response.ok = true;

      revalidatePath("/admin");
    }
  } catch {
    response.message = "An error has occurred";
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

  const isAdmin = await checkAdmin(session?.session.id);

  if (!isAdmin.ok) {
    response.message = isAdmin.message;
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
    response.message = "An error has occurred";
  }

  return response;
};

export const generateRegistrationCode = async (
  request: GenerateRegistrationCodeRequest
): Promise<GenerateRegistrationCodeResponse> => {
  const response: GenerateRegistrationCodeResponse = {
    ok: false,
  };

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = await checkAdmin(session?.session.id);

  if (!isAdmin.ok) {
    response.message = isAdmin.message;
    return response;
  }

  if (request.expirationDate) {
    response.expirationDate = new Date(
      request.expirationDate.setUTCHours(23, 59, 59, 999)
    );
  }

  const registrationCode = await prisma.registrationCode.create({
    data: {
      expirationDate: request.expirationDate,
    },
  });

  if (!registrationCode) {
    return response;
  }

  response.ok = true;
  response.id = registrationCode.id;

  return response;
};

export const getRegistrationCodesAction =
  async (): Promise<GetRegistrationCodesResponse> => {
    const response: GetRegistrationCodesResponse = {
      ok: false,
    };

    const registrationCodes = await prisma.registrationCode.findMany({
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

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = await checkAdmin(session?.session.id);

  if (!isAdmin.ok) {
    response.message = isAdmin.message;
    return response;
  }

  try {
    await prisma.registrationCode.delete({
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

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const isAdmin = await checkAdmin(session?.session.id);

    if (!isAdmin.ok) {
      response.message = isAdmin.message;
      return response;
    }

    try {
      const request = await fetch(
        `${process.env.STREAM_API_URL}/v3/paths/list`,
        {
          method: "GET",
        }
      );

      if (request.ok) {
        const responseApi = await request.json();
        if (responseApi) {
          response.items = responseApi.items.map(
            (i: {
              name: string;
              ready: boolean;
              readyTime: Date;
              readers: [];
            }) => {
              return {
                id: i.name,
                ready: i.ready,
                readyTime: i.readyTime,
                viewers: i.readers.length,
              };
            }
          );

          response.items = await Promise.all(
            response.items.map(async (item) => {
              return {
                ...item,
                id:
                  (
                    await prisma.user.findUnique({
                      where: { id: item.id },
                      select: { name: true },
                    })
                  )?.name || "Failed to get name",
              };
            })
          );
        }
      }
    } catch {}

    return response;
  };
