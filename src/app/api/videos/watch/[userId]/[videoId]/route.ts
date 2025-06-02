import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

interface Params {
  params: Promise<{
    userId: string;
    videoId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userId, videoId } = await params;

  const videoPath = path.join(
    process.cwd(),
    `videos/recordings_saved/${userId}/${videoId}.mp4`
  );

  try {
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const videoStream = fs.createReadStream(videoPath);
    const videoType = `video/mp4`;

    return new Response(videoStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": videoType,
        "Content-Disposition": `inline; filename="${videoId}.mp4"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
