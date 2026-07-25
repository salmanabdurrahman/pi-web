// Per-launch auth token for desktop sidecar mode.
//
// In desktop mode the Electron main process (Phase 4+) generates a random
// token at startup, passes it to the Next.js sidecar server via env var or
// CLI flag, and the renderer sends it as the `X-Pi-Desktop-Auth` header on
// every API request.
//
// In web-only mode (no token set) all checks pass through — the existing
// origin-based proxy guard is sufficient for browser mode.

import { randomBytes } from "crypto";

declare global {
  var __piDesktopAuthToken: string | undefined;
}

/** Generate a fresh per-launch token.  Called once by the desktop main
 *  process before spawning the sidecar server. */
export function generateDesktopAuthToken(): string {
  const token = randomBytes(32).toString("hex");
  globalThis.__piDesktopAuthToken = token;
  return token;
}

/** Initialize auth from an existing token (e.g. passed via env var). */
export function setDesktopAuthToken(token: string): void {
  if (token) globalThis.__piDesktopAuthToken = token;
}

/** Validate a request's desktop-auth header against the active token.
 *  Returns true when:
 *    - NOT in desktop mode (no token set) — web mode passes through
 *    - Header matches the active token */
export function validateDesktopAuthToken(value: string | null | undefined): boolean {
  if (!globalThis.__piDesktopAuthToken) return true;
  if (!value) return false;
  // Constant-time-ish comparison to reduce timing leaks
  const a = globalThis.__piDesktopAuthToken;
  const b = value;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Returns true when a desktop auth token is active. */
export function isDesktopMode(): boolean {
  return globalThis.__piDesktopAuthToken !== undefined;
}
