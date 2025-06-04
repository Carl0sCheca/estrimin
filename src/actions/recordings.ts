"use server";

import {
  DeleteRecordingResponse,
  GetRecordingsListResponse,
  Recording,
  SaveRecordingResponse,
} from "@/interfaces";
import prisma from "@/lib/prisma";
import { UserChannel } from "@/app/(user)/channel/ui/channelSettingsForm";
import { Worker } from "worker_threads";
import fs from "fs";

async function downloadInThread(
  url: string,
  filePath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // https://github.com/vercel/next.js/discussions/56635

    const worker = new Worker(
      /* webpackChunkName: "download.worker" */ new URL(
        "./download.worker.ts",
        import.meta.url
      ),
      { workerData: { url, filePath } }
    );

    worker.on("message", (msg: { success: boolean; error?: string }) => {
      if (msg.success) resolve(true);
      else reject(new Error(msg.error));
    });

    worker.on("error", reject);
    worker.on("exit", (code: number) => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`));
    });
  });
}

export const getRecordingsListAction = async (
  userChannel: UserChannel,
  session: string
): Promise<GetRecordingsListResponse> => {
  const response: GetRecordingsListResponse = {
    ok: false,
    recordings: [],
  };

  try {
    const request = await fetch(
      `${
        process.env.STREAM_RECORDINGS_URL
      }/list?path=${userChannel.user.name.toLowerCase()}&session=${session}`,
      {
        method: "GET",
      }
    );

    if (request.ok) {
      const recordingsNotStored = await request.json();

      response.recordings = recordingsNotStored
        .filter(
          (recording: Recording) => recording.duration && recording.duration > 4
        )
        .map((recording: Recording) => ({
          ...recording,
          type: "not-saved",
          url: `videos/${userChannel.user.name}/${encodeURIComponent(
            btoa(
              JSON.stringify({
                i: recording.start.toString(),
                d: recording.duration,
                t: "n",
              })
            )
          )}`,
        }));

      response.ok = true;
    } else if (request.status === 404) {
      response.ok = true;
    }
  } catch {}

  try {
    const savedRecordings = await prisma.recordingSaved.findMany({
      where: { channel: { userId: userChannel.user.id } },
    });

    response.recordings = [
      ...response.recordings,
      ...savedRecordings.map((r) => {
        return {
          start: r.createdAt,
          url: `videos/${userChannel.user.name}/${encodeURIComponent(
            btoa(
              JSON.stringify({
                i: r.id,
                d: r.duration,
                t: "s",
              })
            )
          )}`,
          type: "saved",
          duration: r.duration,
          id: r.id,
        } satisfies Recording;
      }),
    ];

    response.ok = true;
  } catch (error) {
    console.error("getRecordingsListAction:", error);
  }

  return response;
};

export const deleteRecordingAction = async (
  recording: Recording,
  userChannel: UserChannel
): Promise<DeleteRecordingResponse> => {
  const response: DeleteRecordingResponse = {
    ok: false,
  };

  if (recording?.type === "not-saved") {
    try {
      const request = await fetch(
        `${
          process.env.STREAM_API_URL
        }/v3/recordings/deletesegment?path=${userChannel.user.name.toLowerCase()}&start=${
          recording.start
        }`,
        {
          method: "DELETE",
        }
      );

      if (request.ok) {
        response.ok = true;
      }
    } catch {}
  } else if (
    recording?.type === "clip" ||
    (recording.type === "saved" && recording.id)
  ) {
    try {
      fs.rmSync(
        `${process.env.RECORDINGS_SAVED_PATH}/${userChannel.user.id}/${recording.id}.mp4`
      );

      await prisma.recordingSaved.delete({ where: { id: recording.id } });

      response.ok = true;
    } catch {}
  }

  return response;
};

export const saveRecordingAction = async (
  recording: Recording,
  userChannel: UserChannel,
  session: string
): Promise<SaveRecordingResponse> => {
  const response: SaveRecordingResponse = {
    ok: false,
  };

  try {
    const recordingDb = await prisma.recordingSaved.create({
      data: {
        createdAt: recording.start,
        channelId: userChannel.id,
        duration: recording.duration,
      },
    });

    if (recordingDb) {
      try {
        await downloadInThread(
          `${process.env.STREAM_RECORDINGS_URL}/get?duration=${
            recording.duration
          }&path=${userChannel.user.name.toLowerCase()}&start=${
            recording.start
          }&session=${session}`,
          `${process.env.RECORDINGS_SAVED_PATH}/${userChannel.user.id}/${recordingDb.id}.mp4`
        );
      } catch {
        await prisma.recordingSaved.delete({ where: { id: recordingDb.id } });
        throw Error("Error saving video");
      }

      const deleteResponse = await deleteRecordingAction(
        recording,
        userChannel
      );

      if (deleteResponse.ok) {
        response.recording = {
          ...recording,
          type: "saved",
          id: recordingDb.id,
          url: `videos/${userChannel.user.name}/${encodeURIComponent(
            btoa(
              JSON.stringify({
                i: recordingDb.id,
                d: recording.duration,
                t: "s",
              })
            )
          )}`,
        };
        response.ok = true;
      }
    }
  } catch {}

  return response;
};
