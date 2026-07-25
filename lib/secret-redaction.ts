// Shared secret redaction helpers.
// Used by config-summary and models-config endpoints to avoid
// leaking API keys, tokens, passwords, and private key material.

const SECRET_KEY_PATTERNS = [
  /(?<![a-zA-Z])api[_-]?key(?![a-zA-Z])/i,
  /(?<![a-zA-Z])secret(?![a-zA-Z])/i,
  /(?<![a-zA-Z])token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])password(?![a-zA-Z])/i,
  /(?<![a-zA-Z])credential(?![a-zA-Z])/i,
  /(?<![a-zA-Z])private[_-]?key(?![a-zA-Z])/i,
  /(?<![a-zA-Z])auth(?:orization)?(?![a-zA-Z])/i,
];

/** Returns true when a key name looks like a secret field. */
export function looksSecret(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((p) => p.test(key));
}

/** Returns true when a value looks like an env-var reference rather than a
 *  raw secret (e.g. "OPENAI_API_KEY" or "!env MY_KEY"). */
export function looksEnvRef(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[A-Z_][A-Z0-9_]*$/.test(value) || value.startsWith("!");
}

/**
 * Recursively redact secret values in an object tree.
 *
 * Only primitive values are redacted — nested objects whose key matches
 * a secret pattern are traversed, not replaced wholesale.  Array values
 * are returned as-is (arrays of primitives are rare for config keys).
 *
 * Redaction replacements:
 *  - `<redacted>` for non-empty string / non-null primitive values
 *  - `<env-ref>` for values that look like env-var references
 */
export function redactValue(key: string, value: unknown): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        redacted[k] = redactValue(k, v);
      } else if (looksSecret(k)) {
        if (typeof v === "string" && looksEnvRef(v)) redacted[k] = "<env-ref>";
        else if (typeof v === "string" && v.length > 0) redacted[k] = "<redacted>";
        else redacted[k] = "<redacted>";
      } else {
        redacted[k] = v;
      }
    }
    return redacted;
  }
  if (looksSecret(key)) {
    if (looksEnvRef(value)) return "<env-ref>";
    if (typeof value === "string" && value.length > 0) return "<redacted>";
    return "<redacted>";
  }
  return value;
}
