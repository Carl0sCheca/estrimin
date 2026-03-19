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

  const { data: queueData } = useQuery({
    queryKey: ["admin", "queue", "failed"],
    queryFn: async () => {
      const [requestFailedItems, queueSiteSetting] = await Promise.all([
        GetAllFailedQueueItems(),
        GetQueueSiteSettingsAction(),
      ]);

      return {
        items: requestFailedItems.ok ? requestFailedItems.items : [],
        errorItem: !requestFailedItems.ok,
        disabledQueueJobs: queueSiteSetting.ok,
      };
    },
    refetchInterval: 30000,
  });

  const retryItemMutation = useMutation({
    mutationFn: async (queueId: number) => {
      await RetryFailedQueueItem(queueId);
    },
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({
        queryKey: ["admin", "queue", "failed"],
      });

      const previousData = queryClient.getQueryData([
        "admin",
        "queue",
        "failed",
      ]);

      queryClient.setQueryData(
        ["admin", "queue", "failed"],
        (old: typeof queueData) => {
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
          ["admin", "queue", "failed"],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "queue", "failed"] });
    },
  });

  const retryAllMutation = useMutation({
    mutationFn: async () => {
      await RetryAllFailedQueueItems();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "queue", "failed"] });
    },
  });

  const handleRetryAll = () => {
    retryAllMutation.mutate();
  };

  const handleRetryItem = (queueId: number) => {
    retryItemMutation.mutate(queueId);
  };

  const isLoading = retryAllMutation.isPending || retryItemMutation.isPending;

  return (
    <>
      <Collapsible title="Failed Queue Items" maxHeight={500}>
        <div className="space-y-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRetryAll}
              disabled={
                isLoading ||
                (queueData?.disabledQueueJobs ?? false) ||
                (queueData?.items ?? []).length === 0
              }
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoReloadCircleSharp size={24} />
              <span>
                {isLoading
                  ? "Starting..."
                  : `Retry all failed items (${(queueData?.items ?? []).length})`}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            {queueData?.errorItem && (
              <div className="text-red-500 text-center font-bold">
                Queue service unavailable
              </div>
            )}
            {!queueData?.errorItem &&
              (queueData?.items ?? []).map((item) => (
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
                        isLoading || (queueData?.disabledQueueJobs ?? false)
                      }
                      className="rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-primary-600"
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
