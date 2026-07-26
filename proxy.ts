import { NextResponse, type NextRequest } from "next/server";
import { isApiRequestOriginAllowed, shouldCheckApiRequestOrigin } from "@/lib/request-security";
import { isDesktopMode, validateDesktopAuthToken } from "@/lib/server-auth";

export function proxy(request: NextRequest) {
  // 1. Desktop auth guard (desktop mode): require per-launch token
  //    so random local websites cannot hit the sidecar server. A valid token
  //    also allows Electron's localhost/127.0.0.1 origin mismatch in dev.
  if (isDesktopMode()) {
    if (!validateDesktopAuthToken(request.headers.get("x-pi-desktop-auth"))) {
      return NextResponse.json({ error: "Desktop authentication required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 2. Origin guard (browser mode): reject cross-origin API requests.
  if (shouldCheckApiRequestOrigin(request) && !isApiRequestOriginAllowed(request)) {
    return NextResponse.json(
      { error: "Cross-origin API requests are not allowed" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
