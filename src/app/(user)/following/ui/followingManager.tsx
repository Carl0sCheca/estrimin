"use client";

import { UserUnFollowAction } from "@/actions";
import { Collapsible } from "@/components";
import { useState } from "react";
import { RiUserUnfollowFill } from "react-icons/ri";

interface Props {
  followingListInit: Array<string>;
  sessionUserId: string;
}

export const FollowingManager = ({
  followingListInit,
  sessionUserId,
}: Props) => {
  const [followingList, setFollowingList] = useState(followingListInit);

  return (
    <Collapsible title="Followed channels">
      {followingList.length === 0 && <>You are not following any channel</>}

      <div className="flex max-h-40 overflow-auto">
        <ul className="flex flex-wrap w-full">
          {followingList.map((following) => (
            <button
              className="w-full md:w-1/2 cursor-pointer group hover:bg-gray-300 transition-colors duration-300 rounded-md"
              key={following}
              onClick={async () => {
                const response = await UserUnFollowAction(
                  sessionUserId,
                  following,
                );

                if (response.ok) {
                  setFollowingList((prev) =>
                    prev.filter((p) => p !== following),
                  );
                }
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
