import type { Metadata } from "next";
import { headers } from "next/headers";
import UserForm from "./ui/userForm";
import { redirect } from "next/navigation";
import { User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "User",
};

export default async function UserPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const userChannel = await prisma.channel.findFirst({
    where: { userId: session.user.id },
    select: { token: true },
  });

  const settings = {
    streamUrl: process.env.STREAM_URL,
  };

  let streamKey = "";
  if (userChannel) {
    streamKey = userChannel.token;
  }

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <UserForm
        user={session.user as User}
        streamKey={streamKey}
        settings={settings}
      />
    </div>
  );
}
