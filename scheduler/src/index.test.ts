import { describe, expect, test, vi, beforeEach, type Mock } from "vitest";
import { ToadScheduler, JobStatus } from "toad-scheduler";
import { Reply } from "zeromq";
import {
  listCommand,
  startCommand,
  startAllCommand,
  stopCommand,
  stopAllCommand,
} from "./commands";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    siteSetting: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Scheduler Commands", () => {
  let mockScheduler: ToadScheduler;
  let mockSocket: Reply;

  beforeEach(() => {
    vi.clearAllMocks();

    mockScheduler = {
      getAllJobs: vi.fn(),
      startById: vi.fn(),
      stopById: vi.fn(),
      stop: vi.fn(),
    } as unknown as ToadScheduler;

    mockSocket = {
      send: vi.fn(),
    } as unknown as Reply;
  });

  describe("listCommand", () => {
    test("should return list of jobs with their status", async () => {
      const mockJobs = [
        {
          id: "job1",
          getStatus: vi.fn().mockReturnValue(JobStatus.RUNNING),
          task: { isExecuting: true },
        },
        {
          id: "job2",
          getStatus: vi.fn().mockReturnValue(JobStatus.STOPPED),
          task: { isExecuting: false },
        },
      ];

      const mockQueueDates = {
        job1: "2026-03-08T10:00:00.000Z",
        job2: "2026-03-08T11:00:00.000Z",
      };

      (mockScheduler.getAllJobs as Mock).mockReturnValue(mockJobs);
      (prisma.siteSetting.findFirst as Mock).mockResolvedValue({
        value: mockQueueDates,
      });

      await listCommand(mockSocket, mockScheduler);

      expect(mockScheduler.getAllJobs).toHaveBeenCalled();
      expect(prisma.siteSetting.findFirst).toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("job1"),
      );

      const sentData = JSON.parse(
        (mockSocket.send as Mock).mock.calls[0][0] as string,
      );
      expect(sentData).toHaveLength(2);
      expect(sentData[0]).toMatchObject({
        id: "job1",
        status: JobStatus.RUNNING,
        isRunning: true,
      });
      expect(sentData[1]).toMatchObject({
        id: "job2",
        status: JobStatus.STOPPED,
        isRunning: false,
      });
    });

    test("should handle empty jobs list", async () => {
      (mockScheduler.getAllJobs as Mock).mockReturnValue([]);
      (prisma.siteSetting.findFirst as Mock).mockResolvedValue(null);

      await listCommand(mockSocket, mockScheduler);

      expect(mockSocket.send).toHaveBeenCalledWith("[]");
    });

    test("should handle missing queue dates from database", async () => {
      const mockJobs = [
        {
          id: "job1",
          getStatus: vi.fn().mockReturnValue(JobStatus.RUNNING),
          task: { isExecuting: true },
        },
      ];

      (mockScheduler.getAllJobs as Mock).mockReturnValue(mockJobs);
      (prisma.siteSetting.findFirst as Mock).mockResolvedValue(null);

      await listCommand(mockSocket, mockScheduler);

      const sentData = JSON.parse(
        (mockSocket.send as Mock).mock.calls[0][0] as string,
      );
      expect(sentData[0].lastExecution).toBeUndefined();
    });
  });

  describe("startCommand", () => {
    test("should start a job by id", async () => {
      const jobId = "test-job-id";

      await startCommand(mockSocket, mockScheduler, jobId);

      expect(mockScheduler.startById).toHaveBeenCalledWith(jobId);
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });

    test("should handle undefined args and not start any job", async () => {
      await startCommand(mockSocket, mockScheduler, undefined);

      expect(mockScheduler.startById).not.toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });

    test("should handle empty string args and not start any job", async () => {
      await startCommand(mockSocket, mockScheduler, "");

      expect(mockScheduler.startById).not.toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });
  });

  describe("startAllCommand", () => {
    test("should start all jobs", async () => {
      const mockJobs = [
        { id: "job1", getStatus: vi.fn() },
        { id: "job2", getStatus: vi.fn() },
        { id: "job3", getStatus: vi.fn() },
      ];

      (mockScheduler.getAllJobs as Mock).mockReturnValue(mockJobs);

      await startAllCommand(mockSocket, mockScheduler);

      expect(mockScheduler.getAllJobs).toHaveBeenCalled();
      expect(mockScheduler.startById).toHaveBeenCalledTimes(3);
      expect(mockScheduler.startById).toHaveBeenCalledWith("job1");
      expect(mockScheduler.startById).toHaveBeenCalledWith("job2");
      expect(mockScheduler.startById).toHaveBeenCalledWith("job3");
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });

    test("should handle empty jobs list", async () => {
      (mockScheduler.getAllJobs as Mock).mockReturnValue([]);

      await startAllCommand(mockSocket, mockScheduler);

      expect(mockScheduler.startById).not.toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });

    test("should skip jobs without id", async () => {
      const mockJobs = [
        { id: "job1", getStatus: vi.fn() },
        { id: undefined, getStatus: vi.fn() },
        { id: "job3", getStatus: vi.fn() },
      ];

      (mockScheduler.getAllJobs as Mock).mockReturnValue(mockJobs);

      await startAllCommand(mockSocket, mockScheduler);

      expect(mockScheduler.startById).toHaveBeenCalledTimes(2);
      expect(mockScheduler.startById).toHaveBeenCalledWith("job1");
      expect(mockScheduler.startById).toHaveBeenCalledWith("job3");
    });
  });

  describe("stopCommand", () => {
    test("should stop a job by id", async () => {
      const jobId = "test-job-id";

      await stopCommand(mockSocket, mockScheduler, jobId);

      expect(mockScheduler.stopById).toHaveBeenCalledWith(jobId);
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });

    test("should handle undefined args and not stop any job", async () => {
      await stopCommand(mockSocket, mockScheduler, undefined);

      expect(mockScheduler.stopById).not.toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });

    test("should handle empty string args and not stop any job", async () => {
      await stopCommand(mockSocket, mockScheduler, "");

      expect(mockScheduler.stopById).not.toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });
  });

  describe("stopAllCommand", () => {
    test("should stop all jobs", async () => {
      await stopAllCommand(mockSocket, mockScheduler);

      expect(mockScheduler.stop).toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(null);
    });
  });
});
