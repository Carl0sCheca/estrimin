"use client";

import {
  GetAllFailedQueueItems,
  GetQueueSiteSettingsAction,
  RetryAllFailedQueueItems,
  RetryFailedQueueItem,
} from "@/actions";
import { Collapsible, MouseEnterEventOptions } from "@/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const { data: failedItemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ["admin", "queue", "failed", "items"],
    queryFn: GetAllFailedQueueItems,
    refetchInterval: 30000,
  });

  const { data: queueSettingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["admin", "queue", "failed", "settings"],
    queryFn: GetQueueSiteSettingsAction,
    refetchInterval: 30000,
  });

  const items = failedItemsData?.ok ? failedItemsData.items : [];
  const errorItem = !!failedItemsData && !failedItemsData.ok;
  const disabledQueueJobs = queueSettingsData?.ok ?? false;

  const retryItemMutation = useMutation({
    mutationFn: async (queueId: number) => {
      await RetryFailedQueueItem(queueId);
    },
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({
        queryKey: ["admin", "queue", "failed", "items"],
      });

      const previousData = queryClient.getQueryData([
        "admin",
        "queue",
        "failed",
        "items",
      ]);

      queryClient.setQueryData(
        ["admin", "queue", "failed", "items"],
        (old: typeof failedItemsData) => {
          if (!old) return old;

          return {
            ...old,
            items: old.items.filter((item) => item.id !== queueId),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _queueId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["admin", "queue", "failed", "items"],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "queue", "failed", "items"],
      });
    },
  });

  const retryAllMutation = useMutation({
    mutationFn: async () => {
      await RetryAllFailedQueueItems();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "queue", "failed", "items"],
      });
    },
  });

  const handleRetryAll = () => {
    retryAllMutation.mutate();
  };

  const handleRetryItem = (queueId: number) => {
    retryItemMutation.mutate(queueId);
  };

  const isQueryLoading = isLoadingItems || isLoadingSettings;
  const isMutating = retryAllMutation.isPending || retryItemMutation.isPending;

  return (
    <>
      <Collapsible title="Failed Queue Items" maxHeight={500}>
        <div className="space-y-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRetryAll}
              disabled={
                isQueryLoading ||
                isMutating ||
                disabledQueueJobs ||
                items.length === 0
              }
              className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoReloadCircleSharp size={24} />
              <span>
                {isQueryLoading
                  ? "Loading..."
                  : isMutating
                    ? "Starting..."
                    : `Retry all failed items (${items.length})`}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            {isQueryLoading && (
              <div className="text-primary-600 text-center font-bold">
                Loading failed items...
              </div>
            )}
            {errorItem && (
              <div className="text-red-500 text-center font-bold">
                Queue service unavailable
              </div>
            )}
            {!isQueryLoading &&
              !errorItem &&
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="w-4/8 truncate text-sm font-medium text-gray-900">
                    <span
                      className="font-bold"
                      onMouseEnter={(e) =>
                        tooltip.mouseEnter(e, `User: ${item.userName}`)
                      }
                      onMouseLeave={tooltip.mouseLeave}
                    >
                      {item.id}
                    </span>{" "}
                    -{" "}
                    <span
                      onMouseEnter={(e) => tooltip.mouseEnter(e, item.fileName)}
                      onMouseLeave={tooltip.mouseLeave}
                    >
                      {item.fileName}
                    </span>
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
                      disabled={
                        isQueryLoading || isMutating || disabledQueueJobs
                      }
                      className="cursor-pointer rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-primary-600"
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
