import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** Public storefront: `/seller/` + exact 24-char Mongo ObjectId (hex). */
const PUBLIC_STOREFRONT = /^\/seller\/[a-f\d]{24}$/i;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_STOREFRONT.test(pathname)) {
    return NextResponse.next();
  }
  if (!req.auth) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }
  const role = req.auth.user?.role;
  if (role !== "seller" && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/seller/:path*"],
};
