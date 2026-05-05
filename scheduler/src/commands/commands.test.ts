import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  abortAllJobsMock,
  abortJobMock,
  findManyMock,
  removeByIdMock,
  sendMock,
  startByIdMock,
  stopMock,
  updateManyMock,
} = vi.hoisted(() => ({
  abortAllJobsMock: vi.fn(),
  abortJobMock: vi.fn(),
  findManyMock: vi.fn(),
  removeByIdMock: vi.fn(),
  sendMock: vi.fn(),
  startByIdMock: vi.fn(),
  stopMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock("node:os", () => ({
  hostname: vi.fn(() => "test-host"),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    task: {
      findMany: findManyMock,
      updateMany: updateManyMock,
    },
  },
}));

vi.mock("@scheduler/jobs", () => ({
  MAX_ENCODING_QUEUE: 4,
  maxOneTasksJob: ["single-job"],
}));

vi.mock("../jobs/runtime", () => ({
  abortAllJobs: abortAllJobsMock,
  abortJob: abortJobMock,
}));

vi.mock("../index", () => ({
  ALL_QUEUES_JOBS: ["single-job", "batch-job", "blocked-job"],
}));

import {
  startAllCommand,
  startCommand,
  stopAllCommand,
  stopCommand,
} from "./index";

const createScheduler = () => ({
  startById: startByIdMock,
  stop: stopMock,
  removeById: removeByIdMock,
});

const createSocket = () => ({
  send: sendMock,
});

beforeEach(() => {
  vi.clearAllMocks();

  findManyMock.mockImplementation(async () => []);
  updateManyMock.mockResolvedValue(undefined);
  sendMock.mockResolvedValue(undefined);
});

describe("startCommand", () => {
  test("sends null and does not start when args are missing", async () => {
    await startCommand(
      createSocket() as never,
      createScheduler() as never,
      undefined,
    );

    expect(startByIdMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith(null);
  });

  test("starts the requested job and sends null", async () => {
    await startCommand(
      createSocket() as never,
      createScheduler() as never,
      "queue-a",
    );

    expect(startByIdMock).toHaveBeenCalledWith("queue-a");
    expect(sendMock).toHaveBeenCalledWith(null);
  });
});

describe("stopCommand", () => {
  test("sends null and does not stop when args are missing", async () => {
    await stopCommand(
      createSocket() as never,
      createScheduler() as never,
      undefined,
    );

    expect(abortJobMock).not.toHaveBeenCalled();
    expect(removeByIdMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith(null);
  });

  test("aborts, removes and marks the task as not running", async () => {
    await stopCommand(
      createSocket() as never,
      createScheduler() as never,
      "queue-b",
    );

    expect(abortJobMock).toHaveBeenCalledWith("queue-b");
    expect(removeByIdMock).toHaveBeenCalledWith("queue-b");
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        hostname: "test-host",
        task: "queue-b",
      },
      data: {
        isRunning: false,
      },
    });
    expect(sendMock).toHaveBeenCalledWith(null);
  });
});

describe("stopAllCommand", () => {
  test("aborts every job, stops the scheduler and sends null", async () => {
    await stopAllCommand(createSocket() as never, createScheduler() as never);

    expect(abortAllJobsMock).toHaveBeenCalledOnce();
    expect(stopMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith(null);
  });
});

describe("startAllCommand", () => {
  test("starts eligible jobs and returns the blocked ones", async () => {
    findManyMock.mockImplementation(
      async ({ where }: { where: { task: string } }) => {
        if (where.task === "single-job") {
          return [];
        }

        if (where.task === "batch-job") {
          return [{ hostname: "test-host", isRunning: true }];
        }

        if (where.task === "blocked-job") {
          return [
            { hostname: "test-host", isRunning: true },
            { hostname: "test-host", isRunning: true },
            { hostname: "test-host", isRunning: true },
            { hostname: "test-host", isRunning: true },
          ];
        }

        return [];
      },
    );

    await startAllCommand(createSocket() as never, createScheduler() as never);

    expect(startByIdMock).toHaveBeenCalledTimes(2);
    expect(startByIdMock).toHaveBeenNthCalledWith(1, "single-job");
    expect(startByIdMock).toHaveBeenNthCalledWith(2, "batch-job");
    expect(sendMock).toHaveBeenCalledWith(JSON.stringify(["blocked-job"]));
  });
});
