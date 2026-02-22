import { SITE_SETTING, USER_SETTING } from "@/interfaces";
import prisma from "@/lib/prisma";
import { getDateFromFileName, getFileNameFromPath } from "@/lib/utils-server";
import { NextRequest, NextResponse } from "next/server";
import { rmSync } from "fs";
import { join as pathJoin } from "path";
import { RecordingQueueState, RecordingVisibility } from "@/generated/enums";

interface Params {
  params: Promise<{
    userPath: string | Array<string>;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userPath } = await params;
  const segment = req.nextUrl.searchParams.get("segment") || "";

  const userId =
    typeof userPath === "string" ? userPath : (userPath.at(-1) ?? "");

  const segmentPath = pathJoin(
    "recordings",
    userId,
    (await getFileNameFromPath(segment)) || "",
  );

  const videoPath = pathJoin(process.env.RECORDINGS_PATH || "", segmentPath);

  const fileName = videoPath.split("/").pop() || videoPath;

  const fileDate = await getDateFromFileName(fileName.replace(".mp4", ""));

  if (process.env.DEBUG) {
    console.log(
      "GET /api/videos/segmentComplete:",
      await params,
      userPath,
      segmentPath,
      req,
    );
  }

  let recordingShouldBeDeleted =
    ((
      await prisma.siteSetting.findFirst({
        where: { key: SITE_SETTING.DISABLE_RECORDINGS },
      })
    )?.value as boolean) ?? false;

  if (!recordingShouldBeDeleted) {
    recordingShouldBeDeleted = !(
      ((
        await prisma.userSetting.findUnique({
          where: {
            userId_key: {
              key: USER_SETTING.STORE_PAST_STREAMS,
              userId,
            },
          },
        })
      )?.value as boolean) ?? false
    );
  }

  if (recordingShouldBeDeleted) {
    try {
      rmSync(videoPath);
    } catch (error) {
      console.error("segmentCreate: error removing file", error);
    }

    return new NextResponse(null, { status: 204 });
  }

  const channelStatus = await prisma.channelStatus.findFirst({
    where: { userId },
  });

  const defaultVisibility = await prisma.userSetting
    .findFirst({
      select: { value: true },
      where: {
        key: USER_SETTING.DEFAULT_VISIBILITY_UNSAVED_RECORDINGS,
        userId,
      },
    })
    .catch(() => RecordingVisibility.PRIVATE)
    .then(
      (defaultVisibility) =>
        (defaultVisibility as RecordingVisibility) ??
        RecordingVisibility.PRIVATE,
    );

  try {
    await prisma.recordingQueue.create({
      data: {
        fileName,
        userId,
        duration: 0,
        createdAt: fileDate,
        startedAt: fileDate,
        firstSegmentId: channelStatus?.firstSegmentId,
        visibility: defaultVisibility,
        status: RecordingQueueState.RECORDING,
        segmentsIndex: [channelStatus?.segmentCount ?? 0],
      },
    });
  } catch {
    const shouldBeDeleted = await prisma.recordingQueue.findUnique({
      where: { userId_fileName: { userId, fileName } },
    });
    if (
      shouldBeDeleted?.status === RecordingQueueState.FAILED &&
      shouldBeDeleted.errorState === RecordingQueueState.FAILED
    ) {
      await prisma.recordingQueue.delete({
        where: { id: shouldBeDeleted.id },
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}
