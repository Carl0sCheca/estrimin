import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{
    path: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { path } = await params;
  const segment = req.nextUrl.searchParams.get("segment") ?? "";

  console.log({ path, segment });

  return NextResponse.json({ ok: 0, path, segment });
}
