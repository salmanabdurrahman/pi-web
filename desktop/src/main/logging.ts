import { app, shell } from "electron";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { redactLogText, redactManifestValue } from "./log-redaction";

const MAX_LOG_AGE_DAYS = 7;
const EXPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

let root = "";
let runDir = "";

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "");
}

export function initLogging(): void {
  root = join(app.getPath("userData"), "logs");
  runDir = join(root, `pi-web-${timestamp()}`);
  mkdirSync(runDir, { recursive: true });
  cleanupOldLogs();
}

/** Write a structured log entry to the current run's main log file. */
export function writeLog(scope: string, message: string, extra?: Record<string, unknown>): void {
  if (!runDir) return;
  const entry = {
    ts: new Date().toISOString(),
    scope,
    message,
    ...(extra ? { extra } : {}),
  };
  const line = JSON.stringify(entry) + "\n";
  const file = join(runDir, "main.log");
  writeFileSync(file, line, { flag: "a" });
}

/** Get the path for the sidecar stdout log file. */
export function sidecarOutPath(): string {
  return join(runDir, "sidecar.log");
}

/** Get the path for the sidecar stderr log file. */
export function sidecarErrPath(): string {
  return join(runDir, "sidecar-err.log");
}

/** Get the current run directory. */
export function getRunDir(): string {
  return runDir;
}

/** Collect debug logs into a timestamped directory and reveal in Finder.
 *  Returns the export directory path. */
export function exportDebugLogs(): string {
  const exportDir = join(app.getPath("downloads"), `pi-web-debug-${timestamp()}`);
  mkdirSync(exportDir, { recursive: true });

  // Collect logs from current and recent runs
  const cutoff = Date.now() - EXPORT_WINDOW_MS;
  const collected: string[] = [];

  if (existsSync(root)) {
    for (const entry of readdirSync(root)) {
      const full = join(root, entry);
      try {
        const info = statSync(full);
        if (info.isDirectory() && info.mtimeMs > cutoff) {
          // Copy log files from this run directory
          for (const file of readdirSync(full)) {
            const src = join(full, file);
            const dest = join(exportDir, entry, file);
            mkdirSync(dirname(dest), { recursive: true });
            const redacted = redactLogText(readFileSync(src, "utf8"));
            writeFileSync(dest, redacted);
            collected.push(dest);
          }
        }
      } catch {
        // skip inaccessible
      }
    }
  }

  // Write manifest
  const manifest = {
    exported: new Date().toISOString(),
    version: app.getVersion(),
    name: app.getName(),
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
    uptime: process.uptime(),
    logsDir: root,
    currentRun: runDir,
    collected,
    warning:
      "Debug logs are redacted automatically but may still include local paths, session names, project names, and non-secret metadata.",
  };
  const redactedManifest = redactManifestValue(manifest);
  writeFileSync(join(exportDir, "manifest.json"), JSON.stringify(redactedManifest, null, 2));
  writeFileSync(
    join(exportDir, "README.txt"),
    "Pi Web debug log export. Secrets are redacted automatically. Review before sharing: bundle may include local paths, session names, project names, and non-secret metadata.\n",
  );

  // Reveal in Finder
  shell.showItemInFolder(exportDir);
  return exportDir;
}

function cleanupOldLogs(): void {
  if (!root || !existsSync(root)) return;
  const cutoff = Date.now() - MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    try {
      const info = statSync(full);
      if (info.mtimeMs < cutoff) {
        rmSync(full, { recursive: true, force: true });
      }
    } catch {
      continue;
    }
  }
}
