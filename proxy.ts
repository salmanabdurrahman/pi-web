import { NextResponse, type NextRequest } from "next/server";
import { isApiRequestOriginAllowed, shouldCheckApiRequestOrigin } from "@/lib/request-security";
import { isDesktopMode, validateDesktopAuthToken } from "@/lib/server-auth";

export function proxy(request: NextRequest) {
  // 1. Origin guard (browser mode): reject cross-origin API requests.
  if (shouldCheckApiRequestOrigin(request) && !isApiRequestOriginAllowed(request)) {
    return NextResponse.json(
      { error: "Cross-origin API requests are not allowed" },
      { status: 403 },
    );
  }

  // 2. Desktop auth guard (desktop mode): require per-launch token
  //    so random local websites cannot hit the sidecar server.
  if (isDesktopMode() && !validateDesktopAuthToken(request.headers.get("x-pi-desktop-auth"))) {
    return NextResponse.json({ error: "Desktop authentication required" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
