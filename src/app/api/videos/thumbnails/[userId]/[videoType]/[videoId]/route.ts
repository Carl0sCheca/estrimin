import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { getSafePath, validateParameters } from "@/lib/utils-api";
import s3Client from "@/lib/s3-client";
import { checkIfFileExists, getFileBuffer } from "@scheduler/S3Service";

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

    const safePath = getSafePath(userId, `${videoId}.webp`, videoType);

    if (!safePath) {
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

    if (isUsingS3Bucket) {
      existsThumbnail = await checkIfFileExists(
        `${
          videoType === "n" ? "recordings" : "recordings_saved"
        }/${userId}/${videoId}.webp`,
      );
    } else {
      existsThumbnail = existsSync(safePath);
    }

    if (!existsThumbnail) {
      console.warn(`Image not found: ${safePath}`);

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
          videoType === "n"
            ? process.env.S3_BUCKET_RECORDINGS || ""
            : process.env.S3_BUCKET_RECORDINGS_SAVED || "",
          `${
            videoType === "n" ? "recordings" : "recordings_saved"
          }/${userId}/${videoId}.webp`,
        );
      } else {
        imageBuffer = readFileSync(safePath);
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
