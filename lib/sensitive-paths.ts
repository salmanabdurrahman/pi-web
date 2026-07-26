import { homedir } from "os";
import path from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { isPathWithinRoots } from "./path-security";

const SENSITIVE_FILE_NAMES = new Set([
  ".env",
  "auth.json",
  "trust.json",
  "mcp-cache.json",
  "mcp-npx-cache.json",
  "models-store.json",
  "provider-failover-state.json",
]);

const SENSITIVE_DIR_NAMES = new Set(["sessions"]);
const SENSITIVE_SUFFIXES = [".pem", ".key", ".p12", ".crt"];

function normalize(filePath: string): string {
  return path.resolve(filePath);
}

export function isRestrictedWorkspaceRoot(cwd: string): boolean {
  const resolved = normalize(cwd);
  return resolved === normalize(homedir()) || resolved === normalize(getAgentDir());
}

export function isSensitiveFilePath(filePath: string): boolean {
  const resolved = normalize(filePath);
  const base = path.basename(resolved);
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (SENSITIVE_FILE_NAMES.has(base)) return true;
  if (SENSITIVE_SUFFIXES.some((suffix) => base.endsWith(suffix))) return true;

  const agentDir = normalize(getAgentDir());
  if (!isPathWithinRoots(resolved, new Set([agentDir]))) return false;
  const rel = path.relative(agentDir, resolved);
  const parts = rel.split(path.sep).filter(Boolean);
  return parts.some((part) => SENSITIVE_DIR_NAMES.has(part));
}

export function isSensitiveUploadTarget(directory: string, fileNames: string[]): boolean {
  return fileNames.some((name) => isSensitiveFilePath(path.join(directory, name)));
}
