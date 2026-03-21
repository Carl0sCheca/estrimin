import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createReadStream, existsSync, statSync } from "fs";
import prisma from "@/lib/prisma";
import { RecordingVisibility } from "@/generated/client";
import { validateParameters } from "@/lib/utils-api";
import s3Client from "@/lib/s3-client";
import { checkIfFileExists } from "@scheduler/services/s3.service";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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
  session: string,
): Promise<number> => {
  if (!validateParameters(userId, videoId, videoType)) {
    return 404;
  }

  const isUsingS3Bucket = s3Client !== null;

  let recording;
  let recordingPath;

  try {
    if (videoType === "n") {
      recording = await prisma.recordingQueue
        .findUnique({
          where: { id: +videoId, userId },
        })
        .catch(() => null);

      if (!recording) {
        return 404;
      }

      recordingPath = `${isUsingS3Bucket ? "" : `${process.env.RECORDINGS_PATH}/`}recordings/${userId}/${recording.fileName.replace("s3://", "")}`;
    } else {
      recording = await prisma.recordingSaved
        .findUnique({
          where: { id: videoId },
        })
        .catch(() => null);

      if (!recording) {
        return 404;
      }

      recordingPath = `${isUsingS3Bucket ? "" : `${process.env.RECORDINGS_PATH}/`}recordings_saved/${userId}/${recording.id}.mp4`;
    }

    if (isUsingS3Bucket) {
      const existsFileInS3 = await checkIfFileExists(recordingPath);

      if (!existsFileInS3) {
        return 404;
      }
    } else {
      try {
        if (!existsSync(recordingPath)) {
          return 404;
        }
      } catch {
        return 404;
      }
    }

    if (
      recording.visibility === RecordingVisibility.PRIVATE &&
      (await prisma.session.findFirst({ where: { id: session } }))?.userId !==
        userId
    ) {
      return 404;
    }

    if (recording.visibility === RecordingVisibility.ALLOWLIST) {
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

  return 200;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { userId, videoId, videoType } = await params;
  const session = req.nextUrl.searchParams.get("session") || "";

  const canViewRecording = await isRecordingVisible(
    userId,
    videoId,
    videoType,
    session,
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
    session,
  );

  if (canViewRecording !== 200) {
    return new NextResponse(null, { status: canViewRecording });
  }

  const isUsingS3Bucket = s3Client !== null;

  let recording;
  let recordingPath;

  if (videoType === "n") {
    recording = await prisma.recordingQueue.findUnique({
      where: {
        id: +videoId,
        userId,
      },
    });

    if (!recording) {
      return new NextResponse(null, { status: 404 });
    }
    recordingPath = `${isUsingS3Bucket ? "" : `${process.env.RECORDINGS_PATH}/`}recordings/${userId}/${recording?.fileName.replace("s3://", "")}`;
  } else {
    recording = await prisma.recordingSaved.findUnique({
      where: {
        id: videoId,
      },
    });

    if (!recording) {
      return new NextResponse(null, { status: 404 });
    }

    recordingPath = `${isUsingS3Bucket ? "" : `${process.env.RECORDINGS_PATH}/`}recordings_saved/${userId}/${recording?.id}.mp4`;
  }

  if (isUsingS3Bucket) {
    try {
      const range = req.headers.get("range");

      const head = await s3Client?.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_RECORDINGS,
          Key: recordingPath,
        }),
      );

      const fileSize = head?.ContentLength || 0;
      const contentType = head?.ContentType || "video/mp4";

      const headers = new Headers({
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
        "Content-Disposition": `inline; filename="${recordingPath}"`,
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

        const chunkSize = end - start + 1;

        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_RECORDINGS,
          Key: recordingPath,
          Range: `bytes=${start}-${end}`,
        });

        const s3Response = await s3Client?.send(command);
        const bodyStream = s3Response?.Body as ReadableStream;

        headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        headers.set("Content-Length", chunkSize.toString());

        return new Response(bodyStream, {
          status: 206,
          headers,
        });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_RECORDINGS,
        Key: recordingPath,
      });

      const s3Response = await s3Client?.send(command);
      const bodyStream = s3Response?.Body as ReadableStream;

      headers.set("Content-Length", fileSize.toString());

      return new Response(bodyStream, {
        status: 200,
        headers,
      });
    } catch (err) {
      console.error("Error streaming from S3:", err);
      return new NextResponse(null, { status: 500 });
    }
  } else {
    try {
      const stat = statSync(recordingPath);
      const fileSize = stat.size;
      const range = req.headers.get("range");

      const headers = new Headers({
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
        "Content-Disposition": `inline; filename="${path.basename(
          recordingPath,
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

        const videoStream = createReadStream(recordingPath, { start, end });
        const response = new Response(
          videoStream as unknown as ReadableStream,
          {
            status: 206,
            headers,
          },
        );

        return response;
      } else {
        headers.set("Content-Length", fileSize.toString());
        const videoStream = createReadStream(recordingPath);
        const response = new Response(
          videoStream as unknown as ReadableStream,
          {
            status: 200,
            headers,
          },
        );

        return response;
      }
    } catch (error) {
      console.error("Error streaming video:", error);
      return new NextResponse(null, { status: 500 });
    }
  }
}
