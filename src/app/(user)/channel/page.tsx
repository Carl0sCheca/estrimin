import type { Metadata } from "next";
import { ChannelSettingsForm } from "./ui/channelSettingsForm";
import prisma from "@/lib/prisma";
import { SiteSetting } from "@/generated/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Channel dashboard",
};

export default async function ChannelPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const settings: {
    streamUrl: string;
    channelUrl: string;
    settings: Array<SiteSetting>;
  } = {
    streamUrl: process.env.STREAM_URL || "",
    channelUrl: process.env.BASE_URL || "",
    settings: await prisma.siteSetting.findMany(),
  };

  const userSettings = await prisma.userSetting.findMany({
    where: { userId: session.user.id },
  });

  const userChannel = await prisma.channel.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
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

  return (
    <>
      <div
        className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
      >
        <ChannelSettingsForm
          settings={settings}
          userChannel={userChannel}
          session={session.session.id}
          userSettings={userSettings}
        />
      </div>
    </>
  );
}
