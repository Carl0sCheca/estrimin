import { RecordingQueueState } from "@/generated/enums";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { remoteKey, userId }: { remoteKey?: string; userId?: string } =
    await req.json();

  if (!remoteKey || !userId) {
    return new NextResponse(null, { status: 400 });
  }

  const fileName = remoteKey.split("/").pop() ?? "";

  try {
    await prisma.recordingQueue.update({
      where: {
        userId_fileName: {
          userId,
          fileName,
        },
      },
      data: {
        status: RecordingQueueState.UPLOADING,
        previousState: RecordingQueueState.RECORDED,
        startedAt: new Date(),
      },
    });
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
