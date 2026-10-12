import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate the signed-in areas. Without a Django session cookie there is no account
 * to render, so send the visitor to sign in. The API still enforces this on its
 * own (every portal/manager endpoint resolves request.user); this just avoids
 * rendering an empty shell before the redirect.
 */
export function middleware(request: NextRequest) {
  if (!request.cookies.has("sessionid")) {
    const url = new URL("/signin", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/manager/:path*"],
};
