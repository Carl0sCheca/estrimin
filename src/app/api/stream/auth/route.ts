import { StreamInfo } from "@/interfaces";
import prisma from "@/lib/prisma";
import queryString from "node:querystring";
import { NextRequest, NextResponse } from "next/server";
import {
  ChannelAllowList,
  ChannelVisibility,
  RecordingVisibility,
  Role,
  User,
} from "@/generated/client";

const getStreamParams = (
  query: string,
  path: string,
): {
  stream: string | undefined;
  password: string | undefined;
  session: string | undefined;
} => {
  const parsedParams = queryString.parse(query);
  const { password, session } = parsedParams;
  const stream = path;

  return {
    stream,
    password: Array.isArray(password) ? password[0] : password,
    session: Array.isArray(session) ? session[0] : session,
  };
};

const checkUserWatchStream = async (
  userChannel: {
    visibility: ChannelVisibility;
    visibilityPassword: string | null;
    channelAllowList: ChannelAllowList[];
    userId: string;
    disabled: boolean;
    user: User;
  } | null,
  password: string | undefined,
  userLogged: {
    user: User;
  } | null,
): Promise<{ code: number; message?: string }> => {
  if (userChannel?.visibility === ChannelVisibility.ALL) {
    return { code: 0 };
  } else if (userChannel?.visibility === ChannelVisibility.PASSWORD) {
    if (!password) {
      return { code: -1, message: "Not authorized" };
    } else {
      if (password === userChannel.visibilityPassword) {
        return { code: 0 };
      } else {
        return { code: -1, message: "Not authorized" };
      }
    }
  } else if (userChannel?.visibility === ChannelVisibility.REGISTERED_USERS) {
    if (!userLogged?.user) {
      return { code: -1, message: "Not authorized" };
    } else {
      return { code: 0 };
    }
  } else if (userChannel?.visibility === RecordingVisibility.ALLOWLIST) {
    if (
      userChannel.channelAllowList.find((p) => p.userId === userLogged?.user.id)
    ) {
      return { code: 0 };
    } else {
      return { code: -1, message: "Not authorized" };
    }
  } else {
    return { code: -1, message: "Not authorized" };
  }
};

export async function POST(req: NextRequest) {
  let request: null | StreamInfo = null;
  try {
    request = await req.json();
  } catch {
    return NextResponse.json(
      { code: -1, message: "Empty request" },
      { status: 401 },
    );
  }

  if (!request) {
    return NextResponse.json(
      { code: -1, message: "Empty request" },
      { status: 401 },
    );
  }

  const { token } = request;

  const { stream, password, session } = getStreamParams(
    request.query,
    request.path,
  );

  if (request.action === "playback") {
    const userChannel = await prisma.channel.findFirst({
      select: {
        visibility: true,
        visibilityPassword: true,
        channelAllowList: true,
        userId: true,
        disabled: true,
        user: true,
      },
      where: { user: { id: stream } },
    });

    if (!userChannel) {
      return NextResponse.json(
        { code: -1, message: `No user found. Path: ${request.path}` },
        { status: 401 },
      );
    }

    if (userChannel.disabled) {
      return NextResponse.json(
        { code: -1, message: "Channel is disabled" },
        { status: 401 },
      );
    }

    const userLogged = await prisma.session.findFirst({
      where: {
        id: session || "",
      },
      select: { user: true },
    });

    if (
      userLogged?.user.name.toLowerCase() ===
      userChannel.user.name.toLowerCase()
    ) {
      return NextResponse.json({ code: 0 });
    }

    const isAllowed = await checkUserWatchStream(
      userChannel,
      password,
      userLogged,
    );

    if (isAllowed.code === 0) {
      return NextResponse.json(isAllowed);
    } else if (isAllowed.code === -1) {
      return NextResponse.json(isAllowed, { status: 401 });
    }
  }

  if (request.action === "read") {
    const userLogged = await prisma.session.findFirst({
      where: {
        id: session || "",
      },
      select: { user: true },
    });

    if (userLogged?.user.role === Role.ADMIN) {
      return NextResponse.json({ code: 0 });
    }

    if (!stream) {
      return NextResponse.json(
        { code: -1, message: "Wrong URL format" },
        { status: 401 },
      );
    }

    const userChannel = await prisma.channel.findFirst({
      select: {
        visibility: true,
        visibilityPassword: true,
        channelAllowList: true,
        userId: true,
        disabled: true,
        user: true,
      },
      where: { user: { id: stream } },
    });

    if (userChannel?.disabled) {
      return NextResponse.json(
        { code: -1, message: "Channel is disabled" },
        { status: 401 },
      );
    }

    if (userLogged?.user.id === userChannel?.userId) {
      return NextResponse.json({ code: 0 });
    }

    const isAllowed = await checkUserWatchStream(
      userChannel,
      password,
      userLogged,
    );

    if (isAllowed.code === 0) {
      return NextResponse.json(isAllowed);
    } else if (isAllowed.code === -1) {
      return NextResponse.json(isAllowed, { status: 401 });
    }
  }

  if (!stream || !token) {
    return NextResponse.json(
      { code: -1, message: "Wrong URL format" },
      { status: 401 },
    );
  }

  const userChannel = await prisma.channel.findFirst({
    select: { user: { select: { name: true } }, token: true, disabled: true },
    where: { user: { id: stream }, token },
  });

  if (!userChannel) {
    return NextResponse.json(
      { code: -1, message: `No user found. Path: ${request.path}` },
      { status: 401 },
    );
  }

  if (userChannel.disabled) {
    return NextResponse.json(
      { code: -1, message: "Channel is disabled" },
      { status: 401 },
    );
  }

  if (process.env.NTFY_ENABLED === "true") {
    const user: string = process.env.NTFY_USER || "";
    const password: string = process.env.NTFY_PASSWORD || "";

    const auth = Buffer.from(user + ":" + password).toString("base64");

    const response = await fetch(
      `${process.env.NTFY_URL}/${process.env.NTFY_TOPIC}`,
      {
        method: "POST",
        body: `🔴 ${userChannel.user.name} is streaming`,
        headers: {
          Click: `${process.env.BASE_URL}/${userChannel.user.name}`,
          Authorization: `Basic ${auth}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Error while trying to send the notification");
    }
  }

  return NextResponse.json({ code: 0 });
}
