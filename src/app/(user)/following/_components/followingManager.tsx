"use client";

import { followingListAction, UserUnFollowAction } from "@/actions";
import { Collapsible } from "@/components";
import { UserFollowingListResponse } from "@/interfaces";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RiUserUnfollowFill } from "react-icons/ri";

interface Props {
  followingListInit: UserFollowingListResponse;
  sessionUserId: string;
}

export const FollowingManager = ({
  followingListInit,
  sessionUserId,
}: Props) => {
  const { data: followingList } = useQuery({
    queryKey: ["followingsChannels"],
    queryFn: followingListAction,
    refetchInterval: 30000,
    initialData: followingListInit,
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await UserUnFollowAction(sessionUserId, id);

      console.log(response);

      if (!response.ok) {
        throw new Error("Failed to unfollow user");
      }

      return response;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["followingsChannels"] });

      const previousChannelList = queryClient.getQueryData([
        "followingsChannels",
      ]);

      queryClient.setQueryData(
        ["followingsChannels"],
        (old: UserFollowingListResponse) => {
          if (!old) return old;

          return {
            ...old,
            following: old.following.filter((channel) => channel !== id),
          };
        },
      );

      return { previousChannelList };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(
        ["followingsChannels"],
        context?.previousChannelList,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["followingsChannels"] });
    },
  });

  return (
    <Collapsible title="Followed channels">
      {followingList.following.length === 0 && (
        <>You are not following any channel</>
      )}

      <div className="flex max-h-40 overflow-auto">
        <ul className="flex flex-wrap w-full">
          {followingList.following.map((following) => (
            <button
              className="w-full md:w-1/2 cursor-pointer group hover:bg-gray-300 transition-colors duration-300 rounded-md"
              key={following}
              onClick={() => {
                deleteMutation.mutate(following);
              }}
            >
              <li className="flex w-full p-2 text-left">
                <div
                  className="grow w-11/12 truncate select-none"
                  title={following}
                >
                  {following}
                </div>
                <div className="w-1/12 flex justify-end items-center">
                  <RiUserUnfollowFill className="group-hover:fill-red-500 transition-colors duration-300" />
                </div>
              </li>
            </button>
          ))}
        </ul>
      </div>
    </Collapsible>
  );
};
