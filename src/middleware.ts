import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const has = req.cookies.has("kn_session");
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  if (!has && !isLogin) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|icon.svg|manifest.webmanifest|favicon.ico).*)"] };
