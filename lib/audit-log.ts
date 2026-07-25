// Structured audit log for destructive / config-mutating operations.
//
// Writes one JSON line per action to stderr so it never mixes with
// HTTP response streams.  When the desktop sidecar is active (Phase 4+),
// the same entries are forwarded to the desktop log file automatically
// by the main process.
//
// Payloads are intentionally lightweight — no message bodies, no raw
// secrets.  Only action type, timestamp, and redacted metadata.

export type AuditAction =
  | "config.write"
  | "auth.key.store"
  | "auth.key.delete"
  | "auth.oauth.login"
  | "auth.oauth.logout"
  | "plugin.install"
  | "plugin.remove"
  | "plugin.update"
  | "plugin.disable"
  | "plugin.enable"
  | "skill.install"
  | "skill.toggle"
  | "worktree.create"
  | "worktree.remove"
  | "file.upload"
  | "session.rename"
  | "session.delete"
  | "session.create";

export interface AuditEntry {
  ts: string; // ISO-8601
  action: AuditAction;
  meta: Record<string, unknown>;
}

/**
 * Emit a single audit entry.
 *
 * `meta` must only contain redacted / non-sensitive data:
 * file paths, source names, counts, action results.
 * Never include raw API keys, tokens, passwords, or message bodies.
 */
export function auditLog(action: AuditAction, meta: Record<string, unknown> = {}): void {
  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    action,
    meta,
  };
  process.stderr.write(JSON.stringify(entry) + "\n");
}
