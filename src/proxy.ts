import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
const protectedUserPaths = ["/user", "/channel"];
const protectedAdminPaths = ["/admin"];
const protectedAuthPaths = ["/login", "/register"];

export default async function authMiddleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

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

  if (
    protectedAuthPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path),
    ) &&
    user
  ) {
    return NextResponse.redirect(new URL("/", baseURL));
  }

  return NextResponse.next();
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
