"use server";

import { SITE_SETTING } from "@/interfaces";
import {
  Command,
  DEFAULT_SOCKET,
  GetAllTasksSchedulerResponse,
  GetProcessingStatisticsResponse,
  GetQueueSiteSettingsResponse,
  SOCK_COMMAND,
} from "@/interfaces/actions/scheduler";
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
        (recording) => recording.status === "COMPLETED"
      ).length;
      response.pending = queueRecordings.filter(
        (recording) =>
          recording.status !== "COMPLETED" && recording.status !== "FAILED"
      ).length;
      response.failed = queueRecordings.filter(
        (recording) => recording.status === "FAILED"
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
  state: boolean
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
