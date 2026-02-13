"use client";

import {
  GetAllFailedQueueItems,
  GetQueueSiteSettingsAction,
  RetryAllFailedQueueItems,
  RetryFailedQueueItem,
} from "@/actions";
import { Collapsible, MouseEnterEventOptions } from "@/components";
import { FailedItems } from "@/interfaces/actions/scheduler";
import { useEffect, useState } from "react";
import { IoReloadCircleSharp } from "react-icons/io5";

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

export const FailedQueueItems = ({ tooltip }: Props) => {
  const [failedRecordings, setFailedRecordings] = useState<Array<FailedItems>>(
    [],
  );
  const [errorItem, setErrorJob] = useState(false);
  const [loading, setLoading] = useState(false);

  const [disabledQueueJobs, setDisabledQueueJobs] = useState(false);

  const getData = async () => {
    try {
      const [requestFailedItems, queueSiteSetting] = await Promise.all([
        GetAllFailedQueueItems(),
        GetQueueSiteSettingsAction(),
      ]);

      if (requestFailedItems.ok) {
        setErrorJob(false);
        setFailedRecordings(requestFailedItems.items);
      } else {
        setErrorJob(true);
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

  const handleRetryAll = async () => {
    setLoading(true);
    try {
      await RetryAllFailedQueueItems();
      await getData();
    } catch (error) {
      console.error("Error starting all jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryItem = async (queueId: number) => {
    try {
      await RetryFailedQueueItem(queueId);
      await getData();
    } catch (error) {
      console.error("Error retrying queue item:", error);
    }
  };

  return (
    <>
      <Collapsible title="Failed Queue Items" maxHeight={500}>
        <div className="space-y-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRetryAll}
              disabled={
                loading || disabledQueueJobs || failedRecordings.length === 0
              }
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoReloadCircleSharp size={24} />
              <span>
                {loading
                  ? "Starting..."
                  : `Retry all failed items (${failedRecordings.length})`}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            {errorItem && (
              <div className="text-red-500 text-center font-bold">
                Queue service unavailable
              </div>
            )}
            {!errorItem &&
              failedRecordings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-4/8 truncate text-sm font-medium text-gray-900"
                    title={`${item.fileName}`}
                  >
                    {item.fileName}
                  </div>

                  <div className="w-3/8 text-xs text-gray-500">
                    {item.date ? (
                      new Date(item.date).toLocaleString()
                    ) : (
                      <span className="text-gray-400"></span>
                    )}
                  </div>

                  <div className="w-1/8 flex justify-center">
                    <button
                      onMouseEnter={(e) => tooltip.mouseEnter(e, "Retry")}
                      onMouseLeave={tooltip.mouseLeave}
                      onClick={() => handleRetryItem(item.id)}
                      disabled={loading || disabledQueueJobs}
                      className={`rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-primary-600"
                      }`}
                    >
                      <IoReloadCircleSharp size={20} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Collapsible>
    </>
  );
};
