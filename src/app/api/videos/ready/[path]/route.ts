import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{
    path: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { path } = await params;

  console.log({ path });

  return NextResponse.json({ ok: 0, path });
}
