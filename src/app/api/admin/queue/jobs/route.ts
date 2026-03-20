import { SITE_SETTING } from "@/interfaces";
import {
  DEFAULT_SOCKET,
  SOCK_COMMAND,
  type Command,
} from "@/interfaces/actions/scheduler";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as zmq from "zeromq";

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

  const sock = new zmq.Request();
  sock.receiveTimeout = 10000;

  try {
    sock.connect(DEFAULT_SOCKET);

    const command: Command = {
      c: SOCK_COMMAND.LIST,
    };

    await sock.send(JSON.stringify(command));
    const [result] = await sock.receive();

    const tasks = JSON.parse(new TextDecoder().decode(result));

    return NextResponse.json({ ok: true, tasks });
  } catch {
    return NextResponse.json({ ok: false, tasks: [] });
  } finally {
    sock.close();
  }
};
