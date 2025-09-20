import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { getSafePath, validateParameters } from "@/lib/utils-api";

interface Params {
  params: Promise<{
    userId: string;
    type: string;
    videoId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { userId, type, videoId } = await params;

    if (!validateParameters(userId, videoId, type)) {
      console.warn(
        `Invalid parameters: userId=${userId}, type=${type}, videoId=${videoId}`
      );

      const defaultImagePath = join(
        process.cwd(),
        "public",
        "nothumbnail.webp"
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

    const safePath = getSafePath(userId, `${videoId}.webp`, type);

    if (!safePath) {
      console.warn(
        `Unsafe or invalid path: userId=${userId}, type=${type}, videoId=${videoId}`
      );

      const defaultImagePath = join(
        process.cwd(),
        "public",
        "nothumbnail.webp"
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

    if (!existsSync(safePath)) {
      console.warn(`Image not found: ${safePath}`);

      const defaultImagePath = join(
        process.cwd(),
        "public",
        "nothumbnail.webp"
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
    }

    const imageBuffer = readFileSync(safePath);
    const contentType = "image/webp";

    return new NextResponse(imageBuffer, {
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
