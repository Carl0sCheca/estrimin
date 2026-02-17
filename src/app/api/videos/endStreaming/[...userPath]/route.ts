import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{
    userPath: string | Array<string>;
  }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { userPath } = await params;

  const userId =
    typeof userPath === "string" ? userPath : (userPath.at(-1) ?? "");

  try {
    await prisma.channel.update({
      data: {
        isOnline: false,
        lastOnline: new Date(),
      },
      where: {
        userId,
      },
    });
  } catch {}

  return new NextResponse(null, { status: 204 });
}
