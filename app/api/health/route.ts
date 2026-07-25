import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { getAgentDir, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";
import { getRunningRpcSessionIds, getRpcSessionCount } from "@/lib/rpc-manager";

// Try to read the Pi SDK version; cache the result.
let _sdkVersion: string | null | undefined;
function getSdkVersion(): string | null {
  if (_sdkVersion !== undefined) return _sdkVersion;
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("@earendil-works/pi-coding-agent/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    _sdkVersion = pkg.version ?? null;
  } catch {
    _sdkVersion = null;
  }
  return _sdkVersion;
}

async function getResourceLoaderStatus(agentDir: string): Promise<{
  ok: boolean;
  loadedSkills: number;
  error?: string;
}> {
  try {
    const loader = new DefaultResourceLoader({ cwd: process.cwd(), agentDir });
    await loader.reload();
    const { skills } = loader.getSkills();
    return { ok: true, loadedSkills: skills.length };
  } catch (e) {
    return { ok: false, loadedSkills: 0, error: String(e) };
  }
}

/** Health check endpoint used by the desktop sidecar to verify the Next.js
 *  server is ready before loading the BrowserWindow. Also provides runtime
 *  diagnostics for observability. */
export async function GET() {
  const sdkVersion = getSdkVersion();
  const agentDir = (() => {
    try {
      return getAgentDir();
    } catch {
      return null;
    }
  })();
  const runningSessionIds = getRunningRpcSessionIds();
  const activeSessionCount = getRpcSessionCount();
  const resourceStatus = agentDir ? await getResourceLoaderStatus(agentDir) : null;

  const desktopTokenSet =
    typeof globalThis !== "undefined" &&
    (globalThis as Record<string, unknown>).__piDesktopAuthToken !== undefined;

  return NextResponse.json({
    status: "ok",
    sdkVersion,
    agentDir,
    resourceLoader: resourceStatus,
    activeSessionCount,
    runningSessionIds,
    runningSessionCount: runningSessionIds.length,
    desktopMode: desktopTokenSet,
  });
}
