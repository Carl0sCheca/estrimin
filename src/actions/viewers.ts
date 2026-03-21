"use server";

import { Viewers } from "@/interfaces";
import { getAllPathUrl } from "@/lib/utils-server";

export const GetViewers = async (channelUserId: string): Promise<Viewers> => {
  const response: Viewers = {
    ok: true,
  };

  try {
    let path = await getAllPathUrl(process.env.STREAM_URL || "");

    if (path?.at(0) !== "/") {
      path = "/" + path;
    }

    if (path.at(-1) !== "/") {
      path = path + "/";
    }

    const request = await fetch(
      `${process.env.STREAM_API_URL}/v3/paths/get${path}${channelUserId}`,
      {
        method: "GET",
      },
    );

    if (request.ok) {
      const { readers } = await request.json();

      response.count = readers.length;
    }
  } catch {
    response.ok = false;
  }

  return response;
};
