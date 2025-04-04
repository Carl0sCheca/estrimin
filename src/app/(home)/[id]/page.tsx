import type { Metadata } from "next";
import { VideoPlayer } from "@/components";
import prisma from "@/lib/prisma";
import NotFound from "@/app/not-found";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 0;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;

  const channel = await prisma.channel.findFirst({
    where: { user: { name: id } },
    select: { user: true },
  });

  return {
    title: channel?.user.name || `user ${id} not found`,
  };
}

export default async function StreamingUser(props: Props) {
  const params = await props.params;

  let channel = null;
  try {
    channel = await prisma.channel.findFirst({
      where: { user: { name: params.id } },
    });
  } catch {}

  if (!channel) {
    return <NotFound />;
  }

  if (channel.disabled) {
    return <NotFound />;
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const url = `${process.env.STREAM_URL}/${params.id.toLowerCase()}/whep${
    session ? `?session=${session?.session.id}` : ""
  }`;

  return (
    <div className={"flex h-full w-full z-0"}>
      <VideoPlayer
        className={`flex-auto h-full w-full`}
        url={url}
        channelName={params.id.toLowerCase()}
      />
    </div>
  );
}
