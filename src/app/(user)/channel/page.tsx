import type { Metadata } from "next";
import { ChannelSettingsForm } from "./ui/channelSettingsForm";
import prisma from "@/lib/prisma";
import { Setting } from "@prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Channel settings",
};

export const revalidate = 0;

export default async function ChannelPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const settings: { streamUrl: string; settings: Array<Setting> } = {
    streamUrl: process.env.BASE_URL || "",
    settings: await prisma.setting.findMany(),
  };
  const userChannel = await prisma.channel.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      user: true,
      watchOnly: true,
      watchOnlyPassword: true,
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

  if (!userChannel) {
    redirect("/login");
  }

  return (
    <>
      <div
        className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
      >
        <ChannelSettingsForm settings={settings} userChannel={userChannel} />
      </div>
    </>
  );
}
