import {
  Command,
  DEFAULT_SOCKET,
  SOCK_COMMAND,
} from "@/interfaces/actions/scheduler";

import * as zmq from "zeromq";
import { scheduler } from "./scheduler";

import {
  listCommand,
  startAllCommand,
  startCommand,
  stopAllCommand,
  stopCommand,
} from "./commands";

import {
  JOB_EXPIRED_RECORDINGS_QUEUE,
  JOB_RECORDING_QUEUE_TIMEOUT,
  JOB_RECORDING_QUEUE,
  JOB_UPLOADING_QUEUE,
  queueJob,
  queueJobExpired,
  queueJobTimeout,
  queueUploadingJob,
} from "./jobs";

const initShcheduler = async () => {
  if (!scheduler) return;

  const queues = [
    JOB_RECORDING_QUEUE,
    JOB_EXPIRED_RECORDINGS_QUEUE,
    JOB_UPLOADING_QUEUE,
    JOB_RECORDING_QUEUE_TIMEOUT,
  ];

  const jobs = [queueJob, queueJobExpired, queueUploadingJob, queueJobTimeout];

  try {
    queues.forEach((queue) => {
      scheduler.stopById(queue);
      scheduler.removeById(queue);
    });
  } catch {}

  jobs.forEach((job) => {
    scheduler.addSimpleIntervalJob(job);
  });
};

const messagesFromEstrimin = async () => {
  console.info("Estrimin scheduler started");

  const sock = new zmq.Reply();

  await sock.bind(DEFAULT_SOCKET);

  for await (const [msg] of sock) {
    const message = new TextDecoder().decode(msg);

    const command = JSON.parse(message) as Command;

    const commandAction = +command.c;
    const commandArg = command.a;

    switch (commandAction) {
      case SOCK_COMMAND.LIST:
        await listCommand(sock, scheduler);
        break;
      case SOCK_COMMAND.STOP:
        await stopCommand(sock, scheduler, commandArg);
        break;
      case SOCK_COMMAND.STOP_ALL:
        await stopAllCommand(sock, scheduler);
        break;
      case SOCK_COMMAND.START:
        await startCommand(sock, scheduler, commandArg);
        break;
      case SOCK_COMMAND.START_ALL:
        await startAllCommand(sock, scheduler);
        break;
    }
  }
};

messagesFromEstrimin();

initShcheduler();
