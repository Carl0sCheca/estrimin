"use client";

import {
  GetProcessingStatisticsAction,
  GetQueueSiteSettingsAction,
  SetQueueSiteSettingsAction,
  StartAllScheduledJobAction,
  StartScheduledJobAction,
  StopAllScheduledJobAction,
  StopScheduledJobAction,
} from "@/actions";
import {
  type GetAllTasksSchedulerResponse,
  type Job,
} from "@/interfaces/actions/scheduler";
import { Collapsible, MouseEnterEventOptions, Toggle } from "@/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaCircle, FaPause, FaPlay, FaStop } from "react-icons/fa";

interface Props {
  tooltip: {
    mouseEnter: (
      event: React.MouseEvent<HTMLElement>,
      text: string,
      options?: MouseEnterEventOptions,
    ) => void;
    mouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  };
}

export const QueueJobs = ({ tooltip }: Props) => {
  const queryClient = useQueryClient();

  const { data: jobsData, isLoading: isLoadingJobs } =
    useQuery<GetAllTasksSchedulerResponse>({
      queryKey: ["admin", "queue", "jobs", "list"],
      queryFn: async () => {
        const response = await fetch("/api/admin/queue/jobs", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return { ok: false, tasks: [] };
        }

        return (await response.json()) as GetAllTasksSchedulerResponse;
      },
      refetchInterval: 30000,
    });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["admin", "queue", "jobs", "stats"],
    queryFn: GetProcessingStatisticsAction,
    refetchInterval: 30000,
  });

  const { data: queueSettingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["admin", "queue", "jobs", "settings"],
    queryFn: GetQueueSiteSettingsAction,
    refetchInterval: 30000,
  });

  const jobs = jobsData?.ok ? jobsData.tasks : [];
  const errorJob = !!jobsData && !jobsData.ok;
  const pendingRecordings = statsData?.ok ? (statsData.pending ?? 0) : 0;
  const completedRecordings = statsData?.ok ? (statsData.completed ?? 0) : 0;
  const failedRecordings = statsData?.ok ? (statsData.failed ?? 0) : 0;
  const disabledQueueJobs = queueSettingsData?.ok ?? false;

  const toggleJobMutation = useMutation({
    mutationFn: async (data: { jobId: string; isRunning: boolean }) => {
      if (data.isRunning) {
        await StopScheduledJobAction(data.jobId);
      } else {
        await StartScheduledJobAction(data.jobId);
      }
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: ["admin", "queue", "jobs", "list"],
      });

      const previousData = queryClient.getQueryData([
        "admin",
        "queue",
        "jobs",
        "list",
      ]);

      queryClient.setQueryData(
        ["admin", "queue", "jobs", "list"],
        (old: typeof jobsData) => {
          if (!old) return old;

          return {
            ...old,
            tasks: old.tasks.map((job: Job) =>
              job.id === data.jobId
                ? {
                    ...job,
                    status: data.isRunning ? "stopped" : "running",
                    isRunning: !data.isRunning,
                  }
                : job,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _data, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["admin", "queue", "jobs", "list"],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "queue", "jobs", "list"],
      });
    },
  });

  const startAllMutation = useMutation({
    mutationFn: async () => {
      await StartAllScheduledJobAction();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "queue", "jobs", "list"],
      });
    },
  });

  const stopAllMutation = useMutation({
    mutationFn: async () => {
      await StopAllScheduledJobAction();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "queue", "jobs", "list"],
      });
    },
  });

  const handleToggleJob = (jobId: string, isRunning: boolean) => {
    toggleJobMutation.mutate({ jobId, isRunning });
  };

  const handleStartAll = () => {
    startAllMutation.mutate();
  };

  const handleStopAll = () => {
    stopAllMutation.mutate();
  };

  const isQueryLoading = isLoadingJobs || isLoadingStats || isLoadingSettings;
  const isMutating =
    startAllMutation.isPending ||
    stopAllMutation.isPending ||
    toggleJobMutation.isPending;

  return (
    <>
      <Collapsible title="Queue jobs" maxHeight={500}>
        <div className="space-y-4">
          <div className="flex justify-center">
            <Toggle
              onChange={async () => {
                const response =
                  await SetQueueSiteSettingsAction(!disabledQueueJobs);

                if (response.ok) {
                  queryClient.invalidateQueries({
                    queryKey: ["admin", "queue", "jobs", "settings"],
                  });
                }
              }}
              checked={disabledQueueJobs}
            >
              Disable queue jobs
            </Toggle>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStartAll}
              disabled={
                isQueryLoading || isMutating || disabledQueueJobs || errorJob
              }
              className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlay className="w-4 h-4" />
              <span>
                {isQueryLoading
                  ? "Loading..."
                  : isMutating
                    ? "Starting..."
                    : "Start All Jobs"}
              </span>
            </button>

            <button
              onClick={handleStopAll}
              disabled={isQueryLoading || isMutating || errorJob}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaStop className="w-4 h-4" />
              <span className="mr-4">
                {isQueryLoading
                  ? "Loading..."
                  : isMutating
                    ? "Stopping..."
                    : "Stop All Jobs"}
              </span>
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {completedRecordings}
                </div>
                <div className="text-gray-600">Completed</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingRecordings}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {failedRecordings}
                </div>
                <div className="text-gray-600">Failed</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total progress:</span>
                <span className="font-medium">
                  {completedRecordings + pendingRecordings + failedRecordings >
                  0
                    ? Math.round(
                        (completedRecordings /
                          (completedRecordings +
                            pendingRecordings +
                            failedRecordings)) *
                          100,
                      ) + "%"
                    : "100%"}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      completedRecordings +
                        pendingRecordings +
                        failedRecordings >
                      0
                        ? (completedRecordings /
                            (completedRecordings +
                              pendingRecordings +
                              failedRecordings)) *
                          100
                        : 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {isQueryLoading && (
              <div className="text-primary-600 text-center font-bold">
                Loading queue data...
              </div>
            )}
            {errorJob && (
              <div className="text-red-500 text-center font-bold">
                Queue service unavailable
              </div>
            )}
            {!isQueryLoading &&
              !errorJob &&
              jobs.map((job: Job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-4/8 truncate text-sm font-medium text-gray-900"
                    title={job.id}
                  >
                    {job.id}
                  </div>

                  <div className="w-1/8 flex justify-center">
                    <button
                      onClick={() =>
                        handleToggleJob(job.id, job.status === "running")
                      }
                      disabled={
                        isQueryLoading ||
                        isMutating ||
                        (disabledQueueJobs && job.status === "stopped")
                      }
                      className={`cursor-pointer p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        job.status === "running"
                          ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                          : "bg-gray-100 hover:bg-gray-200 text-primary-600"
                      }`}
                    >
                      {job.status === "running" ? (
                        <FaPause className="w-3 h-3" />
                      ) : (
                        <FaPlay className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="w-1/8">
                    {job.isRunning ? (
                      <div
                        className="flex items-center justify-center"
                        onMouseEnter={(e) => tooltip.mouseEnter(e, "Running")}
                        onMouseLeave={tooltip.mouseLeave}
                      >
                        <FaCircle className="w-3 h-3 text-green-500 animate-pulse" />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center"
                        onMouseEnter={(e) => tooltip.mouseEnter(e, "Stopped")}
                        onMouseLeave={tooltip.mouseLeave}
                      >
                        <FaCircle className="w-3 h-3 text-red-500" />
                      </div>
                    )}
                  </div>

                  <div className="w-2/6 text-xs text-gray-500">
                    {job.lastExecution ? (
                      new Date(job.lastExecution).toLocaleString()
                    ) : (
                      <span className="text-gray-400">Never executed</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Collapsible>
    </>
  );
};
