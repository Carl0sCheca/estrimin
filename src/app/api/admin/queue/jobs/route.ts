import { SITE_SETTING } from "@/interfaces";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async () => {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionData || sessionData.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, tasks: [] }, { status: 403 });
  }

  const disabledQueueJobs =
    ((
      await prisma.siteSetting.findUnique({
        where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
      })
    )?.value as boolean) ?? false;

  if (disabledQueueJobs) {
    return NextResponse.json({ ok: false, tasks: [] });
  }

  const tasks = await prisma.task.findMany();

  return NextResponse.json({ ok: true, tasks });
};
