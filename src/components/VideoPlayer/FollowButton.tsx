"use client";

import { SetUserFollowAction } from "@/actions";
import { useState } from "react";
import { RiUserFollowFill, RiUserUnfollowFill } from "react-icons/ri";

interface Props {
  channelUserId: string;
  sessionUserId: string | undefined;
  isFollowing: boolean;
}

export const FollowButton = ({
  channelUserId,
  sessionUserId,
  isFollowing,
}: Props) => {
  const [isUserFolling, setIsUserFollowing] = useState(isFollowing);

  if (!sessionUserId || channelUserId === sessionUserId) {
    return <></>;
  }

  return (
    <button
      className={
        "flex items-center justify-center rounded-md bg-primary-600 px-3 h-8 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 hover:cursor-pointer"
      }
      onClick={async () => {
        const response = await SetUserFollowAction(
          sessionUserId,
          channelUserId,
          !isUserFolling
        );

        if (response.ok && response.following !== undefined) {
          setIsUserFollowing(response.following);
        }
      }}
    >
      {!isUserFolling && (
        <>
          <RiUserFollowFill className="mr-2" size={18} />
          Follow
        </>
      )}

      {isUserFolling && (
        <>
          <RiUserUnfollowFill className="mr-2" size={18} />
          Unfollow
        </>
      )}
    </button>
  );
};
