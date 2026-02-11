"use client";

import Link from "next/link";
import { IoMdPeople } from "react-icons/io";
import { useQuery } from "@tanstack/react-query";
import { liveFollowingListAction } from "@/actions";
import { LiveUserFollowingResponse } from "@/interfaces";

const fetchLiveFollowingListQuery =
  async (): Promise<LiveUserFollowingResponse> => {
    const res = liveFollowingListAction();

    return res;
  };

export const LiveFollowing = () => {
  const { data: followingListLive, isLoading } = useQuery({
    queryKey: ["liveFollowingsChannels"],
    queryFn: fetchLiveFollowingListQuery,
    refetchInterval: 5000,
  });

  return (
    <div
      className={"sm:mx-auto sm:w-full sm:max-w-sm rounded-lg shadow-lg mt-6"}
    >
      <h2 className="text-4xl p-2">Following</h2>
      {(isLoading ||
        !followingListLive ||
        !followingListLive.ok ||
        (followingListLive.ok && followingListLive.following.length === 0)) && (
        <div className="p-4">No one you follow is live right now</div>
      )}

      {followingListLive &&
        followingListLive.ok &&
        followingListLive.following.length > 0 && (
          <div className="p-4">
            {followingListLive.following.map((following) => (
              <Link
                key={following.id}
                href={following.id}
                className="border-b border-gray-200 py-3 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{following.id}</span>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <IoMdPeople
                        size={18}
                        className="text-primary-500 mt-0.5"
                      />
                      <span>{following.viewers}</span>
                    </div>

                    <span>
                      {new Date(following.readyTime).toLocaleDateString()}
                      {" - "}
                      {new Date(following.readyTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
};
