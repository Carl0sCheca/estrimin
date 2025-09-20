import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import NotFound from "@/app/not-found";
import { VideoList } from "./ui/videoList";
import Link from "next/link";
import { Logo } from "@/components";

export const revalidate = 0;

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;

  const channel = await prisma.channel.findFirst({
    where: { user: { name: id } },
    select: { user: true },
  });

  return {
    title: `${channel?.user.name}'s videos` || `user ${id} not found`,
  };
}

export default async function StreamingUser(props: Props) {
  const { id } = await props.params;

  let channel = null;
  try {
    channel = await prisma.channel.findFirst({
      where: { user: { name: id } },
      select: {
        id: true,
        disabled: true,
        user: true,
        visibility: true,
        visibilityPassword: true,
        token: true,
        channelAllowList: {
          select: {
            id: true,
            channelId: true,
            userId: true,
            user: { select: { name: true } },
          },
        },
      },
    });
  } catch {}

  if (!channel || channel?.disabled) {
    return <NotFound message="Sorry, we can't find that user." />;
  }

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Logo />
        <div className="mt-6">
          <Link href={`/${channel.user.name}`}>
            <span className="text-primary-500 hover:text-primary-600 font-bold">
              {channel.user.name}
            </span>
          </Link>
          &apos;s videos
          <VideoList channel={channel} />
        </div>
      </div>
    </div>
  );
}
