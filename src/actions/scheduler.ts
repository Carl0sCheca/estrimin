"use server";

import { SITE_SETTING } from "@/interfaces";
import {
  Command,
  DEFAULT_SOCKET,
  GetProcessingStatisticsResponse,
  GetQueueSiteSettingsResponse,
  Job,
  SOCK_COMMAND,
} from "@/interfaces/actions/scheduler";
import prisma from "@/lib/prisma";
import * as zmq from "zeromq";

export const GetAllTasksSchedulerAction = async (): Promise<Array<Job>> => {
  const sock = new zmq.Request();

  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.LIST,
  };

  await sock.send(JSON.stringify(command));
  const [result] = await sock.receive();
  sock.close();

  const resultText: Array<Job> = JSON.parse(new TextDecoder().decode(result));

  return resultText;
};

export const StartAllScheduledJobAction = async (): Promise<void> => {
  const sock = new zmq.Request();
  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.START_ALL,
  };

  await sock.send(JSON.stringify(command));
  sock.close();
};

export const StopAllScheduledJobAction = async (): Promise<void> => {
  const sock = new zmq.Request();
  sock.connect(DEFAULT_SOCKET);

  const command: Command = {
    c: SOCK_COMMAND.STOP_ALL,
  };

  await sock.send(JSON.stringify(command));
  sock.close();
};

export const StartScheduledJobAction = async (id: string): Promise<void> => {
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
