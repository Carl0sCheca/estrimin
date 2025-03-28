"use server";

import { Viewers } from "@/interfaces";

export const GetViewers = async (channelName: string): Promise<Viewers> => {
  const response: Viewers = {
    ok: true,
  };

  try {
    const request = await fetch(
      `${process.env.STREAM_API_URL}/v3/paths/get/${channelName}`,
      {
        method: "GET",
      }
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
