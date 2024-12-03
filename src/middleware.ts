import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { User } from "@prisma/client";
import type { Session } from "better-auth";

const protectedUserPaths = ["/user", "/channel"];
const protectedAdminPaths = ["/admin"];
const protectedAuthPaths = ["/login", "/register"];

export default async function authMiddleware(request: NextRequest) {
  const { data } = await betterFetch<{ session: Session; user: User }>(
    "/api/auth/get-session",
    {
      baseURL: process.env.BASE_URL,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  const user = data?.user;

  const baseURL = process.env.BASE_URL;
  if (protectedUserPaths.includes(request.nextUrl.pathname) && !user) {
    return NextResponse.redirect(new URL("/login", baseURL));
  }

  if (
    protectedAdminPaths.includes(request.nextUrl.pathname) &&
    (!user || (user && user?.role !== "ADMIN"))
  ) {
    return NextResponse.redirect(new URL("/", baseURL));
  }

  if (protectedAuthPaths.includes(request.nextUrl.pathname) && user) {
    return NextResponse.redirect(new URL("/", baseURL));
  }

  return NextResponse.next();
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
