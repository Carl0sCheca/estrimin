import NotFound from "@/app/not-found";
import { RecordingPlayer } from "@/components/RecordingsPlayer/RecordingPlayer";
import { VideoBase64 } from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { headers } from "next/headers";

export const revalidate = 0;

interface Props {
  params: Promise<{
    channelId: string;
    videoDataJson: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { channelId } = await props.params;

  const channel = await prisma.channel.findFirst({
    where: { user: { name: channelId } },
    select: { user: true },
  });

  return {
    title: channel?.user.name || `user ${channelId} not found`,
  };
}

export default async function RecordingPlayerPage({
  params,
  searchParams,
}: Props) {
  const { channelId, videoDataJson } = await params;

  let channel = null;
  try {
    channel = await prisma.channel.findFirst({
      where: { user: { name: channelId } },
    });
  } catch {}

  if (!channel || channel?.disabled) {
    return <NotFound message="Sorry, we can't find that user." goBack={true} />;
  }

  let videoData: VideoBase64;
  try {
    videoData = JSON.parse(atob(decodeURIComponent(videoDataJson)));
  } catch {
    return (
      <NotFound message="Sorry, we can't find that video." goBack={true} />
    );
  }

  const { i: videoId, d: videoDuration, t } = videoData;

  let url = "";

  if (t === "n") {
    url = `${
      process.env.STREAM_RECORDINGS_URL
    }/get?duration=${videoDuration}&path=${channelId.toLowerCase()}&start=${videoId}`;
  } else {
    url = `${process.env.BASE_URL}/api/videos/watch/${channel?.userId}/${videoId}`;
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if ((await searchParams)?.password) {
    url = `${url}${url.includes("?") ? "&" : "?"}${
      (await searchParams)?.password
        ? `password=${(await searchParams)?.password}`
        : ""
    }`;
  }

  if (session) {
    url = `${url}${url.includes("?") ? "&" : "?"}${
      session ? `session=${session?.session.id}` : ""
    }`;
  }

  try {
    if (!(await fetch(url)).ok) {
      return (
        <NotFound message="Sorry, we can't find that video." goBack={true} />
      );
    }
  } catch {
    return (
      <NotFound message="Sorry, we can't find that video." goBack={true} />
    );
  }

  return <RecordingPlayer videoUrl={url} />;
}
