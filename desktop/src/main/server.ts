import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let sidecarProcess: ChildProcess | null = null;

function getProjectRoot(): string {
  // __dirname in bundled output points to out/main/; project root is 3 levels up
  const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
  return join(desktopDir, "..");
}

/** Allocate a free TCP port on 127.0.0.1. */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Failed to get port"));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
  });
}

/** Spawn the Next.js server as a child process.
 *  In dev mode (`electron-vite dev`) we run `next dev`.
 *  In packaged mode we run `next start` from the built .next directory. */
export async function spawnNextServer(authToken: string): Promise<{
  port: number;
  process: ChildProcess;
}> {
  const port = await findFreePort();
  const projectRoot = getProjectRoot();

  const nodeBin = process.execPath;
  const nextBin = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const nextArgs = ["dev", "-p", String(port)];

  const child = spawn(nodeBin, [nextBin, ...nextArgs], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(port),
      PI_DESKTOP_AUTH_TOKEN: authToken,
      // Prevent auto-open browser in dev mode
      PI_WEB_NO_OPEN: "1",
      // Loopback enforcement
      NO_PROXY: "127.0.0.1,localhost,::1",
      no_proxy: "127.0.0.1,localhost,::1",
    },
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8").trimEnd();
    if (text) process.stdout.write(`[pi-web] ${text}\n`);
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8").trimEnd();
    if (text) process.stderr.write(`[pi-web] ${text}\n`);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[pi-web] Next.js server exited with code ${code}`);
    }
    sidecarProcess = null;
  });

  sidecarProcess = child;
  return { port, process: child };
}

/** Wait for the Next.js server to respond to health checks. */
export async function waitForHealth(port: number, authToken: string): Promise<void> {
  const url = `http://127.0.0.1:${port}/api/health`;
  const maxAttempts = 60; // 30 seconds max
  const delayMs = 500;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "X-Pi-Desktop-Auth": authToken },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error(`Health check timed out after ${maxAttempts * delayMs}ms`);
}

/** Kill the sidecar Next.js process. */
export function killSidecar(): void {
  if (!sidecarProcess) return;
  try {
    sidecarProcess.kill("SIGTERM");
    // Force kill after 3s
    setTimeout(() => {
      try {
        sidecarProcess?.kill("SIGKILL");
      } catch {
        /* already dead */
      }
    }, 3000);
  } catch {
    /* already dead */
  }
  sidecarProcess = null;
}
