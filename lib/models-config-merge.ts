const SECRET_KEY_PATTERNS = [
  /(?<![a-zA-Z])api[_-]?key(?![a-zA-Z])/i,
  /(?<![a-zA-Z])secret(?![a-zA-Z])/i,
  /(?<![a-zA-Z])token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])access[_-]?token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])refresh[_-]?token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])id[_-]?token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])cookie(?![a-zA-Z])/i,
  /(?<![a-zA-Z])session(?![a-zA-Z])/i,
  /(?<![a-zA-Z])bearer(?![a-zA-Z])/i,
  /(?<![a-zA-Z])password(?![a-zA-Z])/i,
  /(?<![a-zA-Z])credential(?![a-zA-Z])/i,
  /(?<![a-zA-Z])private[_-]?key(?![a-zA-Z])/i,
  /(?<![a-zA-Z])auth(?:orization)?(?![a-zA-Z])/i,
];

const SECRET_PLACEHOLDERS = new Set(["<redacted>", "<env-ref>"]);

function looksSecret(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((p) => p.test(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSecretPlaceholder(value: unknown): boolean {
  return typeof value === "string" && SECRET_PLACEHOLDERS.has(value);
}

/**
 * Merge client-edited models.json with existing disk config so redacted
 * placeholders from GET responses cannot erase real secret values.
 */
export function mergePreservingSecretPlaceholders(
  current: unknown,
  incoming: unknown,
  key = "root",
): unknown {
  if (looksSecret(key) && isSecretPlaceholder(incoming) && current !== undefined) {
    return current;
  }

  if (Array.isArray(incoming)) {
    const currentArray = Array.isArray(current) ? current : [];
    return incoming.map((item, index) =>
      mergePreservingSecretPlaceholders(currentArray[index], item, key),
    );
  }

  if (isPlainObject(incoming)) {
    const currentObject = isPlainObject(current) ? current : {};
    const merged: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(incoming)) {
      merged[childKey] = mergePreservingSecretPlaceholders(
        currentObject[childKey],
        childValue,
        childKey,
      );
    }
    return merged;
  }

  return incoming;
}
