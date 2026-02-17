import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{
    userPath: string | Array<string>;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userPath } = await params;
  const segment = req.nextUrl.searchParams.get("segment") || "";

  const userId =
    typeof userPath === "string" ? userPath : (userPath.at(-1) ?? "");

  try {
    await prisma.channel.update({
      data: {
        isOnline: true,
        lastOnline: new Date(),
      },
      where: {
        userId,
      },
    });
  } catch {}

  return new NextResponse(null, { status: 204 });
}
