"use server";

import { ChangeUserRoleResponse, DisableRegisterResponse } from "@/interfaces";
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
