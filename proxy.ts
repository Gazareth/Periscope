import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE, sitePassword } from "@/lib/auth";

/**
 * Password-protects the whole site when PERISCOPE_PASSWORD is set.
 * Anyone without a valid session is sent to /login, which returns them here afterwards.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!sitePassword() || pathname === "/login") return NextResponse.next();
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own JS/CSS bundles, which hold no screenshot data.
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
