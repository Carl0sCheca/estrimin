"use server";

import { RecordingQueueState } from "@/generated/enums";
import { SITE_SETTING } from "@/interfaces";
import {
  Command,
  DEFAULT_SOCKET,
  GetAllFailedQueueItemsResponse,
  GetAllTasksSchedulerResponse,
  GetProcessingStatisticsResponse,
  GetQueueSiteSettingsResponse,
  SOCK_COMMAND,
} from "@/interfaces/actions/scheduler";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import * as zmq from "zeromq";

export const GetAllTasksSchedulerAction =
  async (): Promise<GetAllTasksSchedulerResponse> => {
    const response: GetAllTasksSchedulerResponse = {
      ok: false,
      tasks: [],
    };

    if (
      ((
        await prisma.siteSetting.findUnique({
          where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
        })
      )?.value as boolean) ??
      false
    ) {
      return response;
    }

    const sock = new zmq.Request();
    sock.receiveTimeout = 10000;

    try {
      sock.connect(DEFAULT_SOCKET);

      const command: Command = {
        c: SOCK_COMMAND.LIST,
      };

      await sock.send(JSON.stringify(command));
      const [result] = await sock.receive();

      response.tasks = JSON.parse(new TextDecoder().decode(result));
      response.ok = true;

      return response;
    } catch {
      return response;
    } finally {
      sock.close();
    }
  };

export const StartAllScheduledJobAction = async (): Promise<void> => {
  if (
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ??
    false
  ) {
    return;
  }

  const sock = new zmq.Request();
  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.START_ALL,
  };

  await sock.send(JSON.stringify(command));
  sock.close();
};

export const StopAllScheduledJobAction = async (): Promise<void> => {
  if (
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ??
    false
  ) {
    return;
  }

  const sock = new zmq.Request();
  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.STOP_ALL,
  };

  await sock.send(JSON.stringify(command));
  sock.close();
};

export const StartScheduledJobAction = async (id: string): Promise<void> => {
  if (
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ??
    false
  ) {
    return;
  }

  const sock = new zmq.Request();
  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.START,
    a: id,
  };

  await sock.send(JSON.stringify(command));
  sock.close();
};

export const StopScheduledJobAction = async (id: string): Promise<void> => {
  if (
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ??
    false
  ) {
    return;
  }

  const sock = new zmq.Request();
  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.STOP,
    a: id,
  };

  await sock.send(JSON.stringify(command));
  sock.close();
};

export const GetProcessingStatisticsAction =
  async (): Promise<GetProcessingStatisticsResponse> => {
    const response: GetProcessingStatisticsResponse = {
      ok: false,
    };

    try {
      const queueRecordings = await prisma.recordingQueue.findMany({
        where: {
          createdAt: {
            gt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
        },
      });

      response.ok = true;
      response.completed = queueRecordings.filter(
        (recording) => recording.status === "COMPLETED",
      ).length;
      response.pending = queueRecordings.filter(
        (recording) =>
          recording.status !== "COMPLETED" && recording.status !== "FAILED",
      ).length;
      response.failed = queueRecordings.filter(
        (recording) => recording.status === "FAILED",
      ).length;
    } catch {}

    return response;
  };

export const GetQueueSiteSettingsAction =
  async (): Promise<GetQueueSiteSettingsResponse> => {
    const response: GetQueueSiteSettingsResponse = {
      ok: false,
    };

    try {
      response.ok =
        ((
          await prisma.siteSetting.findUnique({
            where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
          })
        )?.value as boolean) ?? false;
    } catch {}

    return response;
  };

export const SetQueueSiteSettingsAction = async (
  state: boolean,
): Promise<GetQueueSiteSettingsResponse> => {
  const response: GetQueueSiteSettingsResponse = {
    ok: false,
  };

  try {
    await prisma.siteSetting.upsert({
      create: {
        key: SITE_SETTING.DISABLE_QUEUE_JOBS,
        value: state,
      },
      update: {
        key: SITE_SETTING.DISABLE_QUEUE_JOBS,
        value: state,
      },
      where: {
        key: SITE_SETTING.DISABLE_QUEUE_JOBS,
      },
    });

    response.ok = true;
  } catch {}

  return response;
};

export const RetryAllFailedQueueItems = async () => {
  try {
    await prisma.$executeRaw`
      UPDATE "recordingQueue"
      SET 
        "attempts" = 0,
        "status" = "error"::"RecordingQueueState",
        "error" = NULL
      WHERE "status" = ${RecordingQueueState.FAILED}
    `;
  } catch (e) {
    console.error("RetryAllFailedQueueItems: ", e);
  }
};

export const RetryFailedQueueItem = async (id: number) => {
  try {
    await prisma.$executeRaw`
      UPDATE "recordingQueue"
      SET 
        "attempts" = 0,
        "status" = "error"::"RecordingQueueState",
        "error" = NULL
      WHERE "status" = ${RecordingQueueState.FAILED}
      AND "id" = ${id}
    `;
  } catch (e) {
    console.error("RetryFailedQueueItem: ", e);
  }
};

export const GetAllFailedQueueItems =
  async (): Promise<GetAllFailedQueueItemsResponse> => {
    const response: GetAllFailedQueueItemsResponse = {
      ok: true,
      items: [],
    };

    const sessionData = await auth.api.getSession({
      headers: await headers(),
    });

    if (!sessionData || (sessionData && sessionData.user.role !== "ADMIN")) {
      response.ok = false;
      return response;
    }

    try {
      const items = await prisma.recordingQueue.findMany({
        where: { status: "FAILED" },
        select: {
          finishedAt: true,
          fileName: true,
          error: true,
          id: true,
        },
      });

      response.items = items.map((item) => {
        return {
          id: item.id,
          fileName: item.fileName,
          date: item.finishedAt ?? undefined,
          error: item.error ?? undefined,
        };
      });
    } catch {
      response.ok = false;
    }

    return response;
  };
