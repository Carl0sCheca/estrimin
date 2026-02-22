import { NextRequest, NextResponse } from "next/server";
import { rmSync } from "fs";
import { join as pathJoin } from "path";
import prisma from "@/lib/prisma";
import { StartAllScheduledJobAction } from "@/actions";
import { getFileNameFromPath } from "@/lib/utils-server";
import { RecordingQueueState } from "@/generated/client";

interface Params {
  params: Promise<{
    userPath: string | Array<string>;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userPath } = await params;
  const segment = req.nextUrl.searchParams.get("segment") || "";
  const duration = Number(req.nextUrl.searchParams.get("duration")) || 0;

  const userId =
    typeof userPath === "string" ? userPath : (userPath.at(-1) ?? "");

  const segmentPath = pathJoin(
    "recordings",
    userId,
    (await getFileNameFromPath(segment)) || "",
  );

  const videoPath = pathJoin(process.env.RECORDINGS_PATH || "", segmentPath);

  const fileName = videoPath.split("/").pop() || videoPath;

  if (process.env.DEBUG) {
    console.log(
      "GET /api/videos/segmentComplete:",
      await params,
      userId,
      segmentPath,
      req,
    );
  }

  const existingRecordingEntry = await prisma.recordingQueue.findFirst({
    where: {
      userId,
      fileName,
    },
  });

  if (duration < 0.5) {
    try {
      rmSync(videoPath);
    } catch (error) {
      console.error("segmentCreate: error removing file", error);
    }

    if (existingRecordingEntry) {
      await prisma.recordingQueue.delete({
        where: {
          userId_fileName: {
            userId,
            fileName,
          },
        },
      });
    } else {
      await prisma.recordingQueue.create({
        data: {
          fileName,
          userId,
          duration: 0,
          status: RecordingQueueState.FAILED,
          errorState: RecordingQueueState.FAILED,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  }

  const channelStatus = await prisma.channelStatus.findFirst({
    where: { userId },
  });

  if (!channelStatus) {
    console.error(`segmentCreate: channelStatus not found userId: ${userId}`);
    return new NextResponse(null, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const recording = await tx.recordingQueue.update({
        where: {
          userId_fileName: {
            fileName,
            userId,
          },
        },
        data: {
          duration,
          finishedAt: new Date(),
          status: RecordingQueueState.UPLOADING,
          firstSegmentId: channelStatus.firstSegmentId,
        },
      });

      if (!channelStatus.firstSegmentId) {
        await tx.channelStatus.update({
          where: {
            userId,
          },
          data: {
            firstSegmentId: recording.id,
            segmentCount: { increment: 1 },
          },
        });

        return await tx.recordingQueue.update({
          where: { id: recording.id },
          data: { firstSegmentId: recording.id },
        });
      } else {
        await tx.channelStatus.update({
          where: {
            userId,
          },
          data: {
            segmentCount: { increment: 1 },
          },
        });
      }

      return recording;
    });
  } catch {
    console.error(
      `segmentComplete: Error while updating recordingQueue ${userId}/${fileName}`,
    );
  }

  StartAllScheduledJobAction();

  return NextResponse.json({ ok: 0, userId, segment, duration });
}
