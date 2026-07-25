import { NextResponse } from "next/server";

/** Health check endpoint used by the desktop sidecar to verify the Next.js
 *  server is ready before loading the BrowserWindow. */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
