import { followingListAction, liveFollowingListAction } from "@/actions";
import { Logo } from "@/components";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IoMdPeople } from "react-icons/io";
import { FollowingManager } from "./ui/followingManager";

export const metadata: Metadata = {
  title: "Following",
};

export default async function FollowingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const followingListLive = await liveFollowingListAction();

  const followingList = await followingListAction();

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <Logo />
      <Link
        href="/user"
        className={
          "mt-6 cursor-default flex mx-auto w-40 mb-2 justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        }
      >
        User
      </Link>
      <div
        className={"sm:mx-auto sm:w-full sm:max-w-sm rounded-lg shadow-lg mt-6"}
      >
        <h2 className="text-4xl p-2">Following</h2>
        {(!followingListLive.ok ||
          (followingListLive.ok &&
            followingListLive.following.length === 0)) && (
          <div className="p-4">No one you follow is live right now</div>
        )}

        {followingListLive.ok && followingListLive.following.length > 0 && (
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
      <div className="sm:mx-auto sm:w-full sm:max-w-sm mt-6">
        <FollowingManager
          sessionUserId={session.user.id}
          followingListInit={followingList.following}
        />
      </div>
    </div>
  );
}
