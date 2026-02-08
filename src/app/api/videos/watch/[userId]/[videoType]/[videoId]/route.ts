import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createReadStream, existsSync, statSync } from "fs";
import prisma from "@/lib/prisma";
import { RecordingVisibility } from "@prisma/client";
import { getSafePath, validateParameters } from "@/lib/utils-api";

interface Params {
  params: Promise<{
    userId: string;
    videoId: string;
    videoType: string;
  }>;
}

const isRecordingVisible = async (
  userId: string,
  videoId: string,
  videoType: string,
  session: string
): Promise<number> => {
  if (!validateParameters(userId, videoId, videoType)) {
    return 404;
  }

  try {
    let visibility;

    if (videoType === "n") {
      const safePath = getSafePath(userId, `${videoId}.mp4`, videoType);
      if (!safePath) return 404;

      visibility = (
        await prisma.recordingQueue.findFirst({
          where: {
            fileName: safePath,
          },
        })
      )?.visibility;
    } else {
      visibility = (
        await prisma.recordingSaved.findFirst({
          where: {
            id: videoId,
          },
        })
      )?.visibility;
    }

    if (
      visibility === RecordingVisibility.PRIVATE &&
      (await prisma.session.findFirst({ where: { id: session } }))?.userId !==
        userId
    ) {
      return 404;
    }

    if (visibility === RecordingVisibility.ALLOWLIST) {
      const user = await prisma.session.findFirst({ where: { id: session } });
      const channel = await prisma.channel.findFirst({ where: { userId } });

      if (user?.userId !== userId) {
        if (
          !(
            user &&
            channel &&
            (await prisma.channelAllowList.findFirst({
              where: {
                userId: user.userId,
                channelId: channel.id,
              },
            }))
          )
        ) {
          return 404;
        }
      }
    }
  } catch {
    return 500;
  }

  const safeVideoPath = getSafePath(userId, `${videoId}.mp4`, videoType);
  if (!safeVideoPath) {
    return 404;
  }

  try {
    if (!existsSync(safeVideoPath)) {
      return 404;
    }
  } catch {
    return 404;
  }

  return 200;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { userId, videoId, videoType } = await params;
  const session = req.nextUrl.searchParams.get("session") || "";

  if (!validateParameters(userId, videoId, videoType)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const canViewRecording = await isRecordingVisible(
    userId,
    videoId,
    videoType,
    session
  );

  if (canViewRecording === 200) {
    return NextResponse.json({ ok: true });
  } else {
    return NextResponse.json({ ok: false }, { status: canViewRecording });
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userId, videoId, videoType } = await params;
  const session = req.nextUrl.searchParams.get("session") || "";

  if (!validateParameters(userId, videoId, videoType)) {
    return new NextResponse(null, { status: 404 });
  }

  const canViewRecording = await isRecordingVisible(
    userId,
    videoId,
    videoType,
    session
  );

  if (canViewRecording !== 200) {
    return new NextResponse(null, { status: canViewRecording });
  }

  const safeVideoPath = getSafePath(userId, `${videoId}.mp4`, videoType);
  if (!safeVideoPath) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const stat = statSync(safeVideoPath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    const headers = new Headers({
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
      "Content-Disposition": `inline; filename="${path.basename(
        safeVideoPath
      )}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start < 0 || end < start) {
        headers.set("Content-Range", `bytes */${fileSize}`);
        return new NextResponse(null, { status: 416, headers });
      }

      const chunksize = end - start + 1;

      headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      headers.set("Content-Length", chunksize.toString());

      const videoStream = createReadStream(safeVideoPath, { start, end });
      const response = new Response(videoStream as unknown as ReadableStream, {
        status: 206,
        headers,
      });

      return response;
    } else {
      headers.set("Content-Length", fileSize.toString());
      const videoStream = createReadStream(safeVideoPath);
      const response = new Response(videoStream as unknown as ReadableStream, {
        status: 200,
        headers,
      });

      return response;
    }
  } catch (error) {
    console.error("Error streaming video:", error);
    return new NextResponse(null, { status: 500 });
  }
}
