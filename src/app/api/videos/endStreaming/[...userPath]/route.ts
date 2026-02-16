import { USER_SETTING } from "@/interfaces";
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
    await prisma.userSetting.upsert({
      create: {
        key: USER_SETTING.IS_ONLINE,
        value: false,
        userId,
      },
      update: {
        value: false,
      },
      where: {
        key: USER_SETTING.IS_ONLINE,
        userId,
      },
    });
  } catch {}

  try {
    await prisma.userSetting.upsert({
      create: {
        key: USER_SETTING.LAST_ONLINE,
        value: new Date(),
        userId,
      },
      update: {
        value: new Date(),
      },
      where: {
        key: USER_SETTING.LAST_ONLINE,
        userId,
      },
    });
  } catch {}

  return new NextResponse(null, { status: 204 });
}
