import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import nodePath from "path";

interface Params {
  params: Promise<{
    path: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { path } = await params;
  const segment = req.nextUrl.searchParams.get("segment") || "";
  const duration = Number(req.nextUrl.searchParams.get("duration")) || 0;

  if (duration < 4) {
    try {
      const videoPath = nodePath.join(process.cwd(), "videos", segment);
      fs.rmSync(videoPath);
    } catch (error) {
      console.error("onSegmentComplete: error removing file", error);
    }
  }

  console.log("segment complete: ", { path, segment, duration });

  // TODO: check user settings, delete the video if enabled in the config.

  return NextResponse.json({ ok: 0, path, segment, duration });
}
