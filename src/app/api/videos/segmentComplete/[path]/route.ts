import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import nodePath from "path";
import prisma from "@/lib/prisma";
import { SITE_SETTING, USER_SETTING } from "@/interfaces";
import { StartAllScheduledJobAction } from "@/actions";
import { getDateFromFileName } from "@/lib/utils-server";
import { RecordingQueueState, RecordingVisibility } from "@/generated/client";

interface Params {
  params: Promise<{
    path: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { path } = await params;
  const segment = req.nextUrl.searchParams.get("segment") || "";
  const duration = Number(req.nextUrl.searchParams.get("duration")) || 0;

  if (process.env.DEBUG) {
    console.log(
      "GET /api/videos/segmentComplete:",
      await params,
      path,
      segment,
      req,
    );
  }

  const fileDate = await getDateFromFileName(
    segment.split("/").pop()?.replace(".mp4", "") || "",
  );

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
          where: { key: USER_SETTING.STORE_PAST_STREAMS, userId: path },
        })
      )?.value as boolean) ?? false
    );
  }

  const videoPath = nodePath.join(process.env.RECORDINGS_PATH || "", segment);

  const fileSize = fs.statSync(videoPath);

  if (fileSize.size < 5000 || recordingShouldBeDeleted) {
    try {
      fs.rmSync(videoPath);
    } catch (error) {
      console.error("onSegmentComplete: error removing file", error);
    }

    return NextResponse.json({ ok: 0, path, segment, duration });
  }

  const lastRecording = await prisma.recordingQueue.findFirst({
    where: {
      userId: path,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let firstSegmentId: number | null = null;

  if (lastRecording) {
    const threshold = 2000;

    const expectedEndTime =
      lastRecording.createdAt.getTime() + lastRecording.duration * 1000;

    const minDate = new Date(expectedEndTime - threshold);
    const maxDate = new Date(expectedEndTime + threshold);

    if (fileDate >= minDate && fileDate <= maxDate) {
      firstSegmentId = lastRecording.firstSegmentId;
    }
  }

  try {
    const userSetting = await prisma.userSetting.findFirst({
      where: {
        key: USER_SETTING.DEFAULT_VISIBILITY_UNSAVED_RECORDINGS,
        userId: path,
      },
    });

    const defaultVisibility =
      (userSetting?.value as RecordingVisibility) ??
      RecordingVisibility.PRIVATE;

    const createdRecording = await prisma.recordingQueue.create({
      data: {
        fileName: videoPath.split("/").pop() || videoPath,
        userId: path,
        duration,
        createdAt: fileDate,
        firstSegmentId,
        visibility: defaultVisibility,
        status: process.env.S3_BUCKET_ENDPOINT
          ? RecordingQueueState.UPLOADING
          : RecordingQueueState.PENDING,
      },
    });

    if (!firstSegmentId) {
      await prisma.recordingQueue.update({
        where: {
          id: createdRecording.id,
        },
        data: {
          firstSegmentId: createdRecording.id,
        },
      });
    }
  } catch (error) {
    console.error("Error segmentComplete:", error);
  }

  StartAllScheduledJobAction();

  return NextResponse.json({ ok: 0, path, segment, duration });
}
