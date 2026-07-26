const PRIVATE_KEY_BLOCK =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;

const SECRET_LINE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;"']+/gi, "$1$2<redacted>"],
  [/\b(x-pi-desktop-auth\s*[:=]\s*)[^\s,;"']+/gi, "$1<redacted>"],
  [/\b(cookie\s*[:=]\s*)[^\n\r]+/gi, "$1<redacted>"],
  [/\b(set-cookie\s*[:=]\s*)[^\n\r]+/gi, "$1<redacted>"],
  [
    /\b((?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|oauth[_-]?code|client[_-]?secret|password|secret|token)\s*[:=]\s*)[^\s,;"']+/gi,
    "$1<redacted>",
  ],
  [/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/g, "$1<redacted>"],
  [/\b(sk-[A-Za-z0-9_-]{12,})\b/g, "<redacted>"],
];

const TOKENISH = /\b[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g;

export function redactLogText(input: string): string {
  let out = input.replace(PRIVATE_KEY_BLOCK, "<redacted-private-key>");
  out = out.replace(TOKENISH, "<redacted-token>");
  for (const [pattern, replacement] of SECRET_LINE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function looksSecretKey(key: string): boolean {
  return /api[_-]?key|secret|token|authorization|cookie|password|credential|private[_-]?key|oauth[_-]?code|session/i.test(
    key,
  );
}

export function redactManifestValue(value: unknown, key = ""): unknown {
  if (typeof value === "string") return looksSecretKey(key) ? "<redacted>" : redactLogText(value);
  if (value !== null && value !== undefined && looksSecretKey(key)) return "<redacted>";
  if (Array.isArray(value)) return value.map((item) => redactManifestValue(item, key));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [childKey, item] of Object.entries(value)) {
      next[childKey] = redactManifestValue(item, childKey);
    }
    return next;
  }
  return value;
}
