"use client";

import {
  GetAllTasksSchedulerAction,
  GetProcessingStatisticsAction,
  GetQueueSiteSettingsAction,
  SetQueueSiteSettingsAction,
  StartAllScheduledJobAction,
  StartScheduledJobAction,
  StopAllScheduledJobAction,
  StopScheduledJobAction,
} from "@/actions";
import { Collapsible, MouseEnterEventOptions, Toggle } from "@/components";
import { Job } from "@/interfaces/actions/scheduler";
import { useEffect, useState } from "react";
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
  const [jobs, setJobs] = useState<Array<Job>>([]);
  const [errorJob, setErrorJob] = useState(false);
  const [pendingRecordings, setPendingRecordings] = useState(0);
  const [completedRecordings, setCompletedRecordings] = useState(0);
  const [failedRecordings, setFailedRecordings] = useState(0);
  const [loading, setLoading] = useState(false);

  const [disabledQueueJobs, setDisabledQueueJobs] = useState(false);

  const getData = async () => {
    try {
      const [requestJobs, recordingQueue, queueSiteSetting] = await Promise.all(
        [
          GetAllTasksSchedulerAction(),
          GetProcessingStatisticsAction(),
          GetQueueSiteSettingsAction(),
        ],
      );

      if (requestJobs.ok) {
        setErrorJob(false);
        setJobs(requestJobs.tasks);
      } else {
        setErrorJob(true);
      }

      if (recordingQueue.ok) {
        setPendingRecordings(recordingQueue.pending ?? 0);
        setCompletedRecordings(recordingQueue.completed ?? 0);
        setFailedRecordings(recordingQueue.failed ?? 0);
      }

      setDisabledQueueJobs(queueSiteSetting.ok);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    getData();
    const intervalId = setInterval(getData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const handleStartAll = async () => {
    setLoading(true);
    try {
      await StartAllScheduledJobAction();
      await getData();
    } catch (error) {
      console.error("Error starting all jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    setLoading(true);
    try {
      await StopAllScheduledJobAction();
      await getData();
    } catch (error) {
      console.error("Error stopping all jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJob = async (jobId: string, isRunning: boolean) => {
    try {
      if (isRunning) {
        await StopScheduledJobAction(jobId);
      } else {
        await StartScheduledJobAction(jobId);
      }
      await getData();
    } catch (error) {
      console.error("Error toggling job:", error);
    }
  };

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
                  setDisabledQueueJobs(!disabledQueueJobs);
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
              disabled={loading || disabledQueueJobs}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlay className="w-4 h-4" />
              <span>{loading ? "Starting..." : "Start All Jobs"}</span>
            </button>

            <button
              onClick={handleStopAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaStop className="w-4 h-4" />
              <span className="mr-4">
                {loading ? "Stopping..." : "Stop All Jobs"}
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
            {errorJob && (
              <div className="text-red-500 text-center font-bold">
                Queue service unavailable
              </div>
            )}
            {!errorJob &&
              jobs.map((job) => (
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
                        loading ||
                        (disabledQueueJobs && job.status === "stopped")
                      }
                      className={`p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
