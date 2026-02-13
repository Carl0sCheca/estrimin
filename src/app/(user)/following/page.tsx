import { followingListAction } from "@/actions";
import { Logo } from "@/components";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FollowingManager } from "./_components/followingManager";
import { LiveFollowing } from "./_components/liveFollowings";

export const metadata: Metadata = {
  title: "Following",
};

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

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
      <LiveFollowing />
      <div className="sm:mx-auto sm:w-full sm:max-w-sm mt-6">
        <FollowingManager
          sessionUserId={session.user.id}
          followingListInit={followingList}
        />
      </div>
    </div>
  );
}
