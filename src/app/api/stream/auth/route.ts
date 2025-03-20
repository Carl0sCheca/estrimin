import { StreamInfo } from "@/interfaces";
import prisma from "@/lib/prisma";
import queryString from "node:querystring";
import { NextRequest, NextResponse } from "next/server";
import { ChannelWatchOnly, Role } from "@prisma/client";

function getStreamParams(
  query: string,
  path: string
): {
  stream: string | undefined;
  token: string | undefined;
  password: string | undefined;
  session: string | undefined;
} {
  const parsedParams = queryString.parse(query);
  const { token, password, session } = parsedParams;
  const stream = path;

  return {
    stream,
    token: Array.isArray(token) ? token[0] : token,
    password: Array.isArray(password) ? password[0] : password,
    session: Array.isArray(session) ? session[0] : session,
  };
}

export async function POST(req: NextRequest) {
  let request: null | StreamInfo = null;
  try {
    request = await req.json();
  } catch {
    return NextResponse.json(
      { code: -1, message: "Empty request" },
      { status: 401 }
    );
  }

  if (!request) {
    return NextResponse.json(
      { code: -1, message: "Empty request" },
      { status: 401 }
    );
  }

  const { token, stream, password, session } = getStreamParams(
    request.query,
    request.path
  );

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
        { status: 401 }
      );
    }

    const userChannel = await prisma.channel.findFirst({
      select: {
        watchOnly: true,
        watchOnlyPassword: true,
        channelAllowList: true,
        userId: true,
        disabled: true,
      },
      where: { user: { name: stream } },
    });

    if (userChannel?.disabled) {
      return NextResponse.json(
        { code: -1, message: "Channel is disabled" },
        { status: 401 }
      );
    }

    if (userLogged?.user.id === userChannel?.userId) {
      return NextResponse.json({ code: 0 });
    }

    if (userChannel?.watchOnly === ChannelWatchOnly.ALL) {
      return NextResponse.json({ code: 0 });
    } else if (userChannel?.watchOnly === ChannelWatchOnly.PASSWORD) {
      if (!password) {
        return NextResponse.json(
          { code: -1, message: "Not authorized" },
          { status: 401 }
        );
      } else {
        if (password === userChannel.watchOnlyPassword) {
          return NextResponse.json({ code: 0 });
        } else {
          return NextResponse.json(
            { code: -1, message: "Not authorized" },
            { status: 401 }
          );
        }
      }
    } else if (userChannel?.watchOnly === ChannelWatchOnly.REGISTERED_USERS) {
      if (!userLogged?.user) {
        return NextResponse.json(
          { code: -1, message: "Not authorized" },
          { status: 401 }
        );
      } else {
        return NextResponse.json({ code: 0 });
      }
    } else if (userChannel?.watchOnly === ChannelWatchOnly.ALLOWLIST) {
      if (
        userChannel.channelAllowList.find(
          (p) => p.userId === userLogged?.user.id
        )
      ) {
        return NextResponse.json({ code: 0 });
      } else {
        return NextResponse.json(
          { code: -1, message: "Not authorized" },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { code: -1, message: "Not authorized" },
        { status: 401 }
      );
    }
  }

  if (!stream || !token) {
    return NextResponse.json(
      { code: -1, message: "Wrong URL format" },
      { status: 401 }
    );
  }

  const userChannel = await prisma.channel.findFirst({
    select: { user: { select: { name: true } }, token: true, disabled: true },
    where: { user: { name: stream }, token },
  });

  if (!userChannel) {
    return NextResponse.json(
      { code: -1, message: "No user found" },
      { status: 401 }
    );
  }

  if (userChannel.disabled) {
    return NextResponse.json(
      { code: -1, message: "Channel is disabled" },
      { status: 401 }
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
      }
    );

    if (!response.ok) {
      console.error("Error while trying to send the notification");
    }
  }

  return NextResponse.json({ code: 0 });
}
