import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { validateParameters } from "@/lib/utils-api";
import s3Client from "@/lib/s3-client";
import {
  checkIfFileExists,
  getFileBuffer,
} from "@scheduler/services/s3.service";
import prisma from "@/lib/prisma";
import { RecordingQueue, RecordingSaved } from "@/generated/client";

interface Params {
  params: Promise<{
    userId: string;
    videoType: string;
    videoId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { userId, videoType, videoId } = await params;

    if (!validateParameters(userId, videoId, videoType)) {
      console.warn(
        `Invalid parameters: userId=${userId}, type=${videoType}, videoId=${videoId}`,
      );

      const defaultImagePath = join(
        process.cwd(),
        "public",
        "nothumbnail.webp",
      );
      if (existsSync(defaultImagePath)) {
        const defaultImage = readFileSync(defaultImagePath);
        return new NextResponse(defaultImage, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      return new NextResponse("Invalid parameters", { status: 400 });
    }

    let recording;

    if (videoType === "s") {
      recording = await prisma.recordingSaved.findUnique({
        where: {
          id: videoId,
          channel: { userId },
        },
      });
    } else {
      recording = await prisma.recordingQueue.findUnique({
        where: {
          userId,
          id: +videoId,
        },
      });
    }

    if (!recording) {
      console.warn(
        `Unsafe or invalid path: userId=${userId}, type=${videoType}, videoId=${videoId}`,
      );

      const defaultImagePath = join(
        process.cwd(),
        "public",
        "nothumbnail.webp",
      );
      if (existsSync(defaultImagePath)) {
        const defaultImage = readFileSync(defaultImagePath);
        return new NextResponse(defaultImage, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      return new NextResponse("Invalid path", { status: 400 });
    }

    const isUsingS3Bucket = s3Client !== null;

    let imageBuffer;
    let existsThumbnail = false;

    let recordingPath;

    if (videoType === "n") {
      recordingPath = `${isUsingS3Bucket ? "" : `${process.env.RECORDINGS_PATH}/`}recordings/${(recording as RecordingQueue).userId}/${(recording as RecordingQueue).fileName}`;
    } else {
      const recordingUserId = await prisma.channel.findUnique({
        where: {
          userId,
        },
        select: { user: true },
      });

      recordingPath = `${isUsingS3Bucket ? "" : `${process.env.RECORDINGS_PATH}/`}recordings_saved/${recordingUserId?.user.id}/${(recording as RecordingSaved).id}.mp4`;
    }

    if (isUsingS3Bucket) {
      existsThumbnail = await checkIfFileExists(
        recordingPath.replace("s3://", "").replace(".mp4", ".webp"),
      );
    } else {
      existsThumbnail = existsSync(recordingPath.replace(".mp4", ".webp"));
    }

    if (!existsThumbnail) {
      console.warn(`Image not found: ${videoId}`);

      const defaultImagePath = join(
        process.cwd(),
        "public",
        "nothumbnail.webp",
      );

      if (existsSync(defaultImagePath)) {
        const defaultImage = readFileSync(defaultImagePath);
        return new NextResponse(defaultImage, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      return new NextResponse("Image not found", { status: 404 });
    } else {
      if (isUsingS3Bucket) {
        imageBuffer = await getFileBuffer(
          process.env.S3_BUCKET_RECORDINGS || "",
          recordingPath.replace("s3://", "").replace(".mp4", ".webp"),
        );
      } else {
        imageBuffer = readFileSync(recordingPath.replace(".mp4", ".webp"));
      }
    }

    const contentType = "image/webp";

    return new NextResponse(imageBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("Internal server error:", error);

    const defaultImagePath = join(process.cwd(), "public", "nothumbnail.webp");
    if (existsSync(defaultImagePath)) {
      const defaultImage = readFileSync(defaultImagePath);
      return new NextResponse(defaultImage, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=300",
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return new NextResponse("Internal server error", { status: 500 });
  }
}
