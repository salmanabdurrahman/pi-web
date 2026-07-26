import { NextResponse } from "next/server";
import { invalidateModelsCache } from "@/lib/models-cache";
import { invalidateSessionListCache } from "@/lib/session-reader";

export const dynamic = "force-dynamic";

export async function POST() {
  invalidateModelsCache();
  invalidateSessionListCache();
  // Resource summary loads through a fresh DefaultResourceLoader per request;
  // there is no separate Pi Web resource cache to clear here.
  return NextResponse.json({ success: true, invalidated: ["models", "sessions"] });
}
