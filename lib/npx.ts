import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { execPath } from "process";

const execFileAsync = promisify(execFile);

/**
 * Locate `npx-cli.js` shipped with the running Node.js installation.
 *
 * Kept as fallback for environments where bun is not installed.
 */
function findNpxCli(): string | null {
  const nodeDir = dirname(execPath);
  const candidates = [
    join(nodeDir, "node_modules", "npm", "bin", "npx-cli.js"),
    join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"),
  ];
  for (const p of candidates) {
    try {
      if (existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export interface RunNpxOptions {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface RunNpxResult {
  stdout: string;
  stderr: string;
}

/**
 * Cross-platform wrapper for invoking `bunx <args>` (or `npx <args>` as
 * fallback). Prefers `bun x` when the bun binary is on PATH; falls back to
 * the Node.js-bundled `npx-cli.js` when bun is not available.
 *
 * Never uses a shell, so user-controlled arguments are never interpreted as
 * shell syntax.
 */
export async function runNpx(args: string[], opts: RunNpxOptions = {}): Promise<RunNpxResult> {
  // Prefer bunx (bun x) when available
  try {
    return await execFileAsync("bun", ["x", ...args], {
      timeout: opts.timeout,
      cwd: opts.cwd,
      env: opts.env,
    });
  } catch {
    // bun not found — fall back to npm's npx
  }

  const npxCli = findNpxCli();
  const { command, commandArgs } = npxCli
    ? { command: execPath, commandArgs: [npxCli, ...args] }
    : { command: "npx", commandArgs: args };
  return execFileAsync(command, commandArgs, {
    timeout: opts.timeout,
    cwd: opts.cwd,
    env: opts.env,
  });
}
