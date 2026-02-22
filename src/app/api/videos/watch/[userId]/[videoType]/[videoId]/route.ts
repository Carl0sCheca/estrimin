import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createReadStream, existsSync, statSync } from "fs";
import prisma from "@/lib/prisma";
import { RecordingVisibility } from "@/generated/client";
import { getSafePath, validateParameters } from "@/lib/utils-api";
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

  try {
    let visibility;

    if (videoType === "n") {
      let safePath;

      if (isUsingS3Bucket) {
        const existsFileInS3 = await checkIfFileExists(
          `${
            videoType === "n" ? "recordings" : "recordings_saved"
          }/${userId}/${videoId}.mp4`,
        );

        if (existsFileInS3) {
          safePath = `${
            videoType === "n" ? "recordings" : "recordings_saved"
          }/${userId}/${videoId}.mp4`;
        } else {
          safePath = null;
        }
      } else {
        safePath = getSafePath(userId, `${videoId}.mp4`, videoType);
      }

      if (!safePath) return 404;

      visibility = (
        await prisma.recordingQueue.findFirst({
          where: {
            fileName: `s3://${safePath.split("/").pop()}`,
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

  if (isUsingS3Bucket) {
    return 200;
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

  const safeVideoPath = getSafePath(userId, `${videoId}.mp4`, videoType);
  if (!safeVideoPath) {
    return new NextResponse(null, { status: 404 });
  }

  const isUsingS3Bucket = s3Client !== null;

  if (isUsingS3Bucket) {
    try {
      const range = req.headers.get("range");

      const key = `${
        videoType !== "n" ? "recordings_saved" : "recordings"
      }/${userId}/${videoId}.mp4`;

      const head = await s3Client?.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_RECORDINGS,
          Key: `${
            videoType === "n" ? "recordings" : "recordings_saved"
          }/${userId}/${videoId}.mp4`,
        }),
      );

      const fileSize = head?.ContentLength || 0;
      const contentType = head?.ContentType || "video/mp4";

      const headers = new Headers({
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
        "Content-Disposition": `inline; filename="${key}"`,
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
          Key: key,
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
        Key: key,
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
      const stat = statSync(safeVideoPath);
      const fileSize = stat.size;
      const range = req.headers.get("range");

      const headers = new Headers({
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
        "Content-Disposition": `inline; filename="${path.basename(
          safeVideoPath,
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
        const videoStream = createReadStream(safeVideoPath);
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
